import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { bankAccounts, transactions } from "@/db/schema";
import { getAccountTransactions, type EbTransaction } from "./enablebanking";
import { findRule } from "@/lib/queries/rules";

const extId = (t: EbTransaction) => t.transaction_id || t.entry_reference;

const ymd = (s: string | undefined) =>
  s && /^\d{4}-\d{2}-\d{2}/.test(s)
    ? s.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

/** YYYY-MM-DD `days` ago. */
const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

/**
 * Pull new bank transactions for every linked account of a book into the pending inbox.
 * Dedupes by the bank's transaction id (stored as transactions.external_id) and
 * auto-categorizes via saved rules. Returns how many were imported.
 */
export async function syncBook(
  bookId: string,
  ownerId: string,
  fallbackCurrency: string,
): Promise<number> {
  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.bookId, bookId));

  let imported = 0;

  for (const acc of accounts) {
    // First sync pulls ~89 days; later syncs re-pull a small overlap (dedup handles repeats).
    const from = acc.lastSyncedAt ? daysAgo(7) : daysAgo(89);

    let fetched: EbTransaction[] = [];
    try {
      fetched = await getAccountTransactions(acc.accountId, from);
    } catch {
      continue; // a rate-limited / errored account shouldn't block the rest
    }

    if (fetched.length > 0) {
      const ids = fetched.map(extId).filter((x): x is string => Boolean(x));
      const existing = ids.length
        ? await db
            .select({ e: transactions.externalId })
            .from(transactions)
            .where(
              and(
                eq(transactions.bookId, bookId),
                inArray(transactions.externalId, ids),
              ),
            )
        : [];
      const seen = new Set(existing.map((r) => r.e));

      for (const t of fetched) {
        const id = extId(t);
        if (!id || seen.has(id)) continue;

        const magnitude = parseFloat(t.transaction_amount?.amount ?? "");
        if (!Number.isFinite(magnitude)) continue;
        const cents = Math.round(Math.abs(magnitude) * 100);
        const isIn = t.credit_debit_indicator === "CRDT"; // money in
        const type = isIn ? "income" : "expense";
        const amountCents = isIn ? -cents : cents;

        const remittance = t.remittance_information?.join(" ").trim() || null;
        const merchant =
          (isIn ? t.debtor?.name : t.creditor?.name) ||
          t.creditor?.name ||
          t.debtor?.name ||
          remittance ||
          null;

        const rule = await findRule(bookId, { externalId: id, merchant });

        await db.insert(transactions).values({
          bookId,
          amountCents,
          currency: t.transaction_amount?.currency || fallbackCurrency,
          type,
          status: "pending_category",
          source: "bank",
          txDate: ymd(t.booking_date || t.value_date || t.transaction_date),
          categoryId: rule?.categoryId ?? null,
          subcategoryId: rule?.subcategoryId ?? null,
          merchant: merchant ? merchant.slice(0, 120) : null,
          rawText: remittance,
          externalId: id,
          createdBy: ownerId,
        });
        seen.add(id);
        imported++;
      }
    }

    await db
      .update(bankAccounts)
      .set({ lastSyncedAt: new Date() })
      .where(eq(bankAccounts.id, acc.id));
  }

  return imported;
}
