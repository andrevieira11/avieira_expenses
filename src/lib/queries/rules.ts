import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { merchantRules } from "@/db/schema";

export type RuleMatch = { categoryId: string; subcategoryId: string | null };

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
  if (keys.merchant) {
    const norm = keys.merchant.toLowerCase().trim();
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
          ? data.merchant.toLowerCase().trim()
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
    const norm = data.merchant.toLowerCase().trim();
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
