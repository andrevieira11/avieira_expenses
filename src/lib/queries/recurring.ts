import { and, eq, lte, sql, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { recurringExpenses, categories } from "@/db/schema";

/** Recurring expenses for a book, soonest-due first, with category label. */
export async function getRecurring(bookId: string) {
  return db
    .select({
      id: recurringExpenses.id,
      name: recurringExpenses.name,
      amountCents: recurringExpenses.amountCents,
      currency: recurringExpenses.currency,
      cadence: recurringExpenses.cadence,
      intervalCount: recurringExpenses.intervalCount,
      nextDue: recurringExpenses.nextDue,
      isActive: recurringExpenses.isActive,
      categoryId: recurringExpenses.categoryId,
      subcategoryId: recurringExpenses.subcategoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
    })
    .from(recurringExpenses)
    .leftJoin(categories, eq(categories.id, recurringExpenses.categoryId))
    .where(eq(recurringExpenses.bookId, bookId))
    .orderBy(asc(recurringExpenses.nextDue));
}

export type Recurring = Awaited<ReturnType<typeof getRecurring>>[number];

/** Count of active recurring items due on/before a given "YYYY-MM-DD". */
export async function getDueCount(bookId: string, onOrBefore: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recurringExpenses)
    .where(
      and(
        eq(recurringExpenses.bookId, bookId),
        eq(recurringExpenses.isActive, true),
        lte(recurringExpenses.nextDue, onOrBefore),
      ),
    );
  return row?.count ?? 0;
}
