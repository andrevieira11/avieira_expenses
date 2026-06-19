import { and, eq, ne, gte, lt, desc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/db/client";
import { transactions, categories, subcategories } from "@/db/schema";
import { monthRange, yearRange } from "@/lib/dates";

// Money model: expense > 0 (out); income/refund < 0 (in). "Spending" = everything
// except income (so refunds reduce spending). Income is tracked separately.

/** Spending (expenses minus refunds), income, balance and count for a month. */
export async function getMonthSummary(
  bookId: string,
  year: number,
  month: number,
) {
  const { start, endExclusive } = monthRange(year, month);
  const [row] = await db
    .select({
      spentCents: sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.type} <> 'income'), 0)::int`,
      incomeCents: sql<number>`coalesce(-sum(${transactions.amountCents}) filter (where ${transactions.type} = 'income'), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.bookId, bookId),
        eq(transactions.status, "confirmed"),
        gte(transactions.txDate, start),
        lt(transactions.txDate, endExclusive),
      ),
    );
  return {
    spentCents: row.spentCents,
    incomeCents: row.incomeCents,
    balanceCents: row.incomeCents - row.spentCents,
    count: row.count,
  };
}

/** Per-category spending totals for a month (income excluded), biggest first. */
export async function getMonthCategoryTotals(
  bookId: string,
  year: number,
  month: number,
) {
  const { start, endExclusive } = monthRange(year, month);
  return db
    .select({
      categoryId: categories.id,
      name: categories.name,
      color: categories.color,
      netCents: sql<number>`coalesce(sum(${transactions.amountCents}), 0)::int`,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.bookId, bookId),
        eq(transactions.status, "confirmed"),
        ne(transactions.type, "income"),
        gte(transactions.txDate, start),
        lt(transactions.txDate, endExclusive),
      ),
    )
    .groupBy(categories.id, categories.name, categories.color)
    .orderBy(desc(sql`sum(${transactions.amountCents})`));
}

const TX_COLUMNS = {
  id: transactions.id,
  amountCents: transactions.amountCents,
  type: transactions.type,
  txDate: transactions.txDate,
  merchant: transactions.merchant,
  note: transactions.note,
  categoryId: transactions.categoryId,
  subcategoryId: transactions.subcategoryId,
  categoryName: categories.name,
  categoryColor: categories.color,
  subcategoryName: subcategories.name,
};

/** Confirmed transactions for a month, newest first, with category labels. */
export async function getMonthTransactions(
  bookId: string,
  year: number,
  month: number,
) {
  const { start, endExclusive } = monthRange(year, month);
  return db
    .select(TX_COLUMNS)
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(subcategories, eq(subcategories.id, transactions.subcategoryId))
    .where(
      and(
        eq(transactions.bookId, bookId),
        eq(transactions.status, "confirmed"),
        gte(transactions.txDate, start),
        lt(transactions.txDate, endExclusive),
      ),
    )
    .orderBy(desc(transactions.txDate), desc(transactions.createdAt));
}

/** Most recent confirmed transactions across all months (the ledger view). */
export async function getRecentTransactions(bookId: string, limit = 100) {
  return db
    .select(TX_COLUMNS)
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(subcategories, eq(subcategories.id, transactions.subcategoryId))
    .where(
      and(
        eq(transactions.bookId, bookId),
        eq(transactions.status, "confirmed"),
      ),
    )
    .orderBy(desc(transactions.txDate), desc(transactions.createdAt))
    .limit(limit);
}

/** Search confirmed transactions by merchant, note, category or subcategory text. */
export async function searchTransactions(
  bookId: string,
  q: string,
  limit = 200,
) {
  const term = `%${q}%`;
  return db
    .select(TX_COLUMNS)
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(subcategories, eq(subcategories.id, transactions.subcategoryId))
    .where(
      and(
        eq(transactions.bookId, bookId),
        eq(transactions.status, "confirmed"),
        or(
          ilike(transactions.merchant, term),
          ilike(transactions.note, term),
          ilike(categories.name, term),
          ilike(subcategories.name, term),
        ),
      ),
    )
    .orderBy(desc(transactions.txDate), desc(transactions.createdAt))
    .limit(limit);
}

/** Pending (moey!) captures awaiting a category — the inbox. */
export async function getPendingTransactions(bookId: string) {
  return db
    .select(TX_COLUMNS)
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(subcategories, eq(subcategories.id, transactions.subcategoryId))
    .where(
      and(
        eq(transactions.bookId, bookId),
        eq(transactions.status, "pending_category"),
      ),
    )
    .orderBy(desc(transactions.createdAt));
}

export async function getPendingCount(bookId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.bookId, bookId),
        eq(transactions.status, "pending_category"),
      ),
    );
  return row?.count ?? 0;
}

export type MonthTransaction = Awaited<
  ReturnType<typeof getMonthTransactions>
>[number];
export type CategoryTotal = Awaited<
  ReturnType<typeof getMonthCategoryTotals>
>[number];

/** Net spending per month (1..12) for a year, income excluded, empty months as 0. */
export async function getYearMonthlyTotals(bookId: string, year: number) {
  const { start, endExclusive } = yearRange(year);
  const rows = await db
    .select({
      ym: sql<string>`to_char(${transactions.txDate}, 'YYYY-MM')`,
      netCents: sql<number>`coalesce(sum(${transactions.amountCents}), 0)::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.bookId, bookId),
        eq(transactions.status, "confirmed"),
        ne(transactions.type, "income"),
        gte(transactions.txDate, start),
        lt(transactions.txDate, endExclusive),
      ),
    )
    .groupBy(sql`to_char(${transactions.txDate}, 'YYYY-MM')`);

  const map = new Map(rows.map((r) => [r.ym, r.netCents]));
  return Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    return { month: i + 1, netCents: map.get(key) ?? 0 };
  });
}

/** Per-category spending totals for a whole year (income excluded), biggest first. */
export async function getYearCategoryTotals(
  bookId: string,
  year: number,
): Promise<CategoryTotal[]> {
  const { start, endExclusive } = yearRange(year);
  return db
    .select({
      categoryId: categories.id,
      name: categories.name,
      color: categories.color,
      netCents: sql<number>`coalesce(sum(${transactions.amountCents}), 0)::int`,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.bookId, bookId),
        eq(transactions.status, "confirmed"),
        ne(transactions.type, "income"),
        gte(transactions.txDate, start),
        lt(transactions.txDate, endExclusive),
      ),
    )
    .groupBy(categories.id, categories.name, categories.color)
    .orderBy(desc(sql`sum(${transactions.amountCents})`));
}

/** Every transaction in a book, flattened for CSV export. */
export async function getAllTransactionsForExport(bookId: string) {
  return db
    .select({
      txDate: transactions.txDate,
      amountCents: transactions.amountCents,
      type: transactions.type,
      status: transactions.status,
      category: categories.name,
      subcategory: subcategories.name,
      merchant: transactions.merchant,
      note: transactions.note,
      source: transactions.source,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(subcategories, eq(subcategories.id, transactions.subcategoryId))
    .where(eq(transactions.bookId, bookId))
    .orderBy(desc(transactions.txDate), desc(transactions.createdAt));
}
