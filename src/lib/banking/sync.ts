import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { bankAccounts, transactions } from "@/db/schema";
import { getAccountTransactions, type GcTransaction } from "./gocardless";
import { findRule } from "@/lib/queries/rules";

const txExternalId = (t: GcTransaction) =>
  t.transactionId || t.internalTransactionId;

const ymd = (s: string | undefined) =>
  s && /^\d{4}-\d{2}-\d{2}/.test(s)
    ? s.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

/**
 * Pull new bank transactions for every linked account of a book into the pending inbox.
 * Dedupes by GoCardless transaction id (stored as transactions.external_id) and
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
    let booked: GcTransaction[] = [];
    try {
      ({ booked } = await getAccountTransactions(acc.accountId));
    } catch {
      continue; // a rate-limited / errored account shouldn't block the rest
    }
    if (booked.length === 0) continue;

    const ids = booked
      .map(txExternalId)
      .filter((x): x is string => Boolean(x));
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

    for (const t of booked) {
      const extId = txExternalId(t);
      if (!extId || seen.has(extId)) continue;

      const amt = parseFloat(t.transactionAmount.amount); // negative = out
      if (!Number.isFinite(amt)) continue;
      const cents = Math.round(Math.abs(amt) * 100);
      const isOut = amt < 0;
      const type = isOut ? "expense" : "income";
      const amountCents = isOut ? cents : -cents;
      const merchant =
        (
          t.creditorName ||
          t.debtorName ||
          t.remittanceInformationUnstructured ||
          ""
        ).slice(0, 120) || null;

      const rule = await findRule(bookId, { externalId: extId, merchant });

      await db.insert(transactions).values({
        bookId,
        amountCents,
        currency: t.transactionAmount.currency || fallbackCurrency,
        type,
        status: "pending_category",
        source: "bank",
        txDate: ymd(t.bookingDate || t.valueDate),
        categoryId: rule?.categoryId ?? null,
        subcategoryId: rule?.subcategoryId ?? null,
        merchant,
        rawText: t.remittanceInformationUnstructured ?? null,
        externalId: extId,
        createdBy: ownerId,
      });
      seen.add(extId);
      imported++;
    }

    await db
      .update(bankAccounts)
      .set({ lastSyncedAt: new Date() })
      .where(eq(bankAccounts.id, acc.id));
  }

  return imported;
}
