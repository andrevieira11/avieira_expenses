import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { merchantRules } from "@/db/schema";

export type RuleMatch = { categoryId: string; subcategoryId: string | null };

/** Normalize a merchant/bank description for matching: strip accents, ref numbers and a
 *  leading payment verb so "COMPRA BCM BRICOLAGE 6470482" matches a future "...BRICOLAGE 12". */
export function normalizeMerchant(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b\d{3,}\b/g, " ")
    .replace(
      /^\s*(compra|pagamento|pagam|pag|paga|levantamento|trf|transferencia|mb\s*way|mbway|sepa)\s+/,
      "",
    )
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Find a saved category rule for a capture — by external id first, then merchant text. */
export async function findRule(
  bookId: string,
  keys: { externalId?: string | null; merchant?: string | null },
): Promise<RuleMatch | null> {
  if (keys.externalId) {
    const [r] = await db
      .select({
        categoryId: merchantRules.categoryId,
        subcategoryId: merchantRules.subcategoryId,
      })
      .from(merchantRules)
      .where(
        and(
          eq(merchantRules.bookId, bookId),
          eq(merchantRules.externalId, keys.externalId),
        ),
      )
      .limit(1);
    if (r) return r;
  }
  const norm = keys.merchant ? normalizeMerchant(keys.merchant) : "";
  if (norm) {
    const [r] = await db
      .select({
        categoryId: merchantRules.categoryId,
        subcategoryId: merchantRules.subcategoryId,
      })
      .from(merchantRules)
      .where(
        and(
          eq(merchantRules.bookId, bookId),
          eq(merchantRules.normalizedMerchant, norm),
        ),
      )
      .limit(1);
    if (r) return r;
  }
  return null;
}

/**
 * Teach a rule when a capture is categorized. Keyed by external id when present
 * (so future same-id transactions auto-categorize), otherwise by merchant text.
 */
export async function learnRule(
  bookId: string,
  data: {
    externalId?: string | null;
    merchant?: string | null;
    categoryId: string;
    subcategoryId?: string | null;
  },
) {
  const sub = data.subcategoryId ?? null;

  if (data.externalId) {
    await db
      .insert(merchantRules)
      .values({
        bookId,
        externalId: data.externalId,
        normalizedMerchant: data.merchant
          ? normalizeMerchant(data.merchant) || null
          : null,
        categoryId: data.categoryId,
        subcategoryId: sub,
      })
      .onConflictDoUpdate({
        target: [merchantRules.bookId, merchantRules.externalId],
        targetWhere: sql`external_id is not null`,
        set: {
          categoryId: data.categoryId,
          subcategoryId: sub,
          hitCount: sql`${merchantRules.hitCount} + 1`,
        },
      });
  } else if (data.merchant) {
    const norm = normalizeMerchant(data.merchant);
    if (!norm) return;
    await db
      .insert(merchantRules)
      .values({
        bookId,
        normalizedMerchant: norm,
        categoryId: data.categoryId,
        subcategoryId: sub,
      })
      .onConflictDoUpdate({
        target: [merchantRules.bookId, merchantRules.normalizedMerchant],
        targetWhere: sql`normalized_merchant is not null`,
        set: {
          categoryId: data.categoryId,
          subcategoryId: sub,
          hitCount: sql`${merchantRules.hitCount} + 1`,
        },
      });
  }
}
