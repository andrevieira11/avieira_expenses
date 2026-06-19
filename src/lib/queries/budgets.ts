import { and, eq, lte, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { budgets } from "@/db/schema";

export type ResolvedBudget = {
  /** Overall monthly budget in cents, or null if none set for/before this month. */
  overallCents: number | null;
  /** Active per-category budgets for the month (latest effective row per category). */
  perCategory: { categoryId: string; amountCents: number }[];
};

/**
 * Resolve a book's effective budget for a month. `monthStart` is the month's first day
 * ("YYYY-MM-01"). Returns the latest row with effective_from <= monthStart per scope —
 * so a future-dated budget never affects the past. See CLAUDE.md domain invariant #4.
 */
export async function resolveBudget(
  bookId: string,
  monthStart: string,
): Promise<ResolvedBudget> {
  const [overall] = await db
    .select({ amountCents: budgets.amountCents })
    .from(budgets)
    .where(
      and(
        eq(budgets.bookId, bookId),
        eq(budgets.scope, "overall"),
        lte(budgets.effectiveFrom, monthStart),
      ),
    )
    .orderBy(desc(budgets.effectiveFrom))
    .limit(1);

  const perCategoryRows = await db
    .selectDistinctOn([budgets.categoryId], {
      categoryId: budgets.categoryId,
      amountCents: budgets.amountCents,
    })
    .from(budgets)
    .where(
      and(
        eq(budgets.bookId, bookId),
        eq(budgets.scope, "category"),
        lte(budgets.effectiveFrom, monthStart),
      ),
    )
    .orderBy(budgets.categoryId, desc(budgets.effectiveFrom));

  return {
    overallCents: overall?.amountCents ?? null,
    perCategory: perCategoryRows.flatMap((r) =>
      r.categoryId ? [{ categoryId: r.categoryId, amountCents: r.amountCents }] : [],
    ),
  };
}
