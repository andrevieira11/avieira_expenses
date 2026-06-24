import { and, eq, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "@/db/client";
import { bankAccounts, bankDismissed, transactions } from "@/db/schema";
import { getAccountTransactions, type EbTransaction } from "./enablebanking";
import { findRule } from "@/lib/queries/rules";

const ymd = (s: string | undefined) =>
  s && /^\d{4}-\d{2}-\d{2}/.test(s)
    ? s.slice(0, 10)
    : new Date().toISOString().slice(0, 10);

/** YYYY-MM-DD `days` ago. */
const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

const remitOf = (t: EbTransaction) =>
  (
    t.remittance_information?.join(" ") ||
    t.creditor?.name ||
    t.debtor?.name ||
    ""
  )
    .toLowerCase()
    .trim();

/**
 * Stable content key for transactions the bank doesn't give a real id for (often pending):
 * date + amount + party/description. Lets a pending spend show up now, then dedupe against
 * its own booked version later (which carries the same content) instead of duplicating.
 */
const contentKey = (t: EbTransaction) =>
  "c_" +
  createHash("sha1")
    .update(
      `${ymd(t.booking_date || t.value_date || t.transaction_date)}|${
        t.transaction_amount?.amount ?? ""
      }|${remitOf(t)}`,
    )
    .digest("hex")
    .slice(0, 22);

const primaryId = (t: EbTransaction) => t.transaction_id || t.entry_reference;

/** Tidy a raw bank description for display: drop ref numbers + leading payment verbs. */
const cleanMerchant = (s: string) =>
  s
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/^\s*(compra|pagamento|pag|trf|levantamento)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

// Banks cap unattended access at ~4 fetches/day. Skip automatic pulls within this window
// of the last real fetch so we never trip "exceeded consented multiplicity".
const COOLDOWN_MS = 6 * 60 * 60 * 1000;

export type SyncOptions = {
  /** Ignore each account's sync floor and pull this many days of history (recovery). */
  fromOverrideDays?: number;
  /** Also re-import transactions the user previously cleared/deleted (full recovery). */
  ignoreDismissed?: boolean;
  /** User-initiated: bypass the per-account cooldown (manual Sync now / Import). */
  force?: boolean;
};

/**
 * Pull new bank transactions (booked + pending) for every linked account of a book into the
 * pending inbox. Dedupes by the bank id AND a content key, skips dismissed ids, auto-categorizes
 * via saved rules. Returns how many were imported. Throws if every account's fetch failed.
 */
export async function syncBook(
  bookId: string,
  ownerId: string,
  fallbackCurrency: string,
  opts: SyncOptions = {},
  stats?: { fetched: number },
): Promise<number> {
  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.bookId, bookId));
  if (accounts.length === 0) return 0;

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
  let errors = 0;
  let firstError: string | null = null;

  for (const acc of accounts) {
    if (
      !opts.force &&
      acc.lastSyncedAt &&
      Date.now() - acc.lastSyncedAt.getTime() < COOLDOWN_MS
    ) {
      continue; // too soon for an automatic pull — protect the daily quota
    }

    let from: string;
    if (opts.fromOverrideDays != null) {
      from = daysAgo(opts.fromOverrideDays);
    } else {
      const floor = acc.syncFrom.toISOString().slice(0, 10);
      const overlap = acc.lastSyncedAt ? daysAgo(7) : floor;
      from = overlap > floor ? overlap : floor;
    }

    let fetched: EbTransaction[] = [];
    try {
      fetched = await getAccountTransactions(acc.accountId, from);
    } catch (e) {
      errors++;
      firstError ||= e instanceof Error ? e.message : "Bank fetch failed";
      continue;
    }
    if (stats) stats.fetched += fetched.length;

    if (fetched.length > 0) {
      // Existing ids (real + content) already in this book, to dedupe against.
      const candidateIds = fetched.flatMap((t) => {
        const pk = primaryId(t);
        const ck = contentKey(t);
        return pk ? [pk, ck] : [ck];
      });
      const existing = candidateIds.length
        ? await db
            .select({ e: transactions.externalId })
            .from(transactions)
            .where(
              and(
                eq(transactions.bookId, bookId),
                inArray(transactions.externalId, candidateIds),
              ),
            )
        : [];
      const seen = new Set(existing.map((r) => r.e));

      for (const t of fetched) {
        const pk = primaryId(t);
        const ck = contentKey(t);
        const id = pk || ck;
        if (
          (pk && (seen.has(pk) || dismissed.has(pk))) ||
          seen.has(ck) ||
          dismissed.has(ck)
        ) {
          continue;
        }

        const magnitude = parseFloat(t.transaction_amount?.amount ?? "");
        if (!Number.isFinite(magnitude)) continue;
        const cents = Math.round(Math.abs(magnitude) * 100);
        const isIn = t.credit_debit_indicator === "CRDT"; // money in
        const type = isIn ? "income" : "expense";
        const amountCents = isIn ? -cents : cents;

        const remittance = t.remittance_information?.join(" ").trim() || null;
        const rawMerchant =
          (isIn ? t.debtor?.name : t.creditor?.name) ||
          t.creditor?.name ||
          t.debtor?.name ||
          remittance ||
          null;
        const merchant = rawMerchant
          ? cleanMerchant(rawMerchant) || rawMerchant
          : null;

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
        if (pk) seen.add(pk);
        seen.add(ck);
        imported++;
      }
    }

    await db
      .update(bankAccounts)
      .set({ lastSyncedAt: new Date() })
      .where(eq(bankAccounts.id, acc.id));
  }

  // Surface a genuine API failure instead of a misleading "nothing new".
  if (errors === accounts.length && firstError) throw new Error(firstError);

  return imported;
}
