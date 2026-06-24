import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { bankAccounts, bankDismissed, transactions } from "@/db/schema";
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

export type SyncOptions = {
  /** Ignore each account's sync floor and pull this many days of history (recovery). */
  fromOverrideDays?: number;
  /** Also re-import transactions the user previously cleared/deleted (full recovery). */
  ignoreDismissed?: boolean;
};

/**
 * Pull new bank transactions for every linked account of a book into the pending inbox.
 * Dedupes by the bank's transaction id (transactions.external_id), skips ids the user
 * dismissed, and auto-categorizes via saved rules. Returns how many were imported.
 */
export async function syncBook(
  bookId: string,
  ownerId: string,
  fallbackCurrency: string,
  opts: SyncOptions = {},
): Promise<number> {
  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.bookId, bookId));
  if (accounts.length === 0) return 0;

  // Ids the user explicitly removed — never bring them back (unless doing a full recovery).
  const dismissed = opts.ignoreDismissed
    ? new Set<string>()
    : new Set(
        (
          await db
            .select({ e: bankDismissed.externalId })
            .from(bankDismissed)
            .where(eq(bankDismissed.bookId, bookId))
        ).map((r) => r.e),
      );

  let imported = 0;

  for (const acc of accounts) {
    let from: string;
    if (opts.fromOverrideDays != null) {
      from = daysAgo(opts.fromOverrideDays); // recovery: ignore the per-account floor
    } else {
      // Floor at link time so a fresh account brings no history; re-pull a 7d overlap after.
      const floor = acc.syncFrom.toISOString().slice(0, 10);
      const overlap = acc.lastSyncedAt ? daysAgo(7) : floor;
      from = overlap > floor ? overlap : floor;
    }

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
        if (!id || seen.has(id) || dismissed.has(id)) continue;

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
