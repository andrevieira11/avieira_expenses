"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { budgets, categories } from "@/db/schema";
import { getActiveBook } from "@/lib/queries/active-book";

const schema = z.object({
  scope: z.enum(["overall", "category"]),
  categoryId: z.string().min(1).nullable(),
  amountCents: z.number().int().min(0).max(2_000_000_000),
  // Always the first of the month this budget takes effect.
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-01$/, "Mês inválido"),
});

export type SetBudgetInput = z.infer<typeof schema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Set (or update) an effective-dated budget. Upserts on the period so re-setting the
 * same month overwrites; a new month leaves the past untouched (invariant #4).
 */
export async function setBudget(input: SetBudgetInput): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Sessão expirada" };
    const data = schema.parse(input);

    if (data.scope === "category") {
      if (!data.categoryId) return { ok: false, error: "Categoria em falta" };
      const c = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, data.categoryId),
            eq(categories.bookId, ctx.book.id),
          ),
        )
        .limit(1);
      if (!c.length) return { ok: false, error: "Categoria inválida" };

      await db
        .insert(budgets)
        .values({
          bookId: ctx.book.id,
          scope: "category",
          categoryId: data.categoryId,
          amountCents: data.amountCents,
          currency: ctx.book.currency,
          effectiveFrom: data.effectiveFrom,
          createdBy: ctx.user.id,
        })
        .onConflictDoUpdate({
          target: [budgets.bookId, budgets.categoryId, budgets.effectiveFrom],
          targetWhere: sql`scope = 'category'`,
          set: { amountCents: data.amountCents, createdBy: ctx.user.id },
        });
    } else {
      await db
        .insert(budgets)
        .values({
          bookId: ctx.book.id,
          scope: "overall",
          categoryId: null,
          amountCents: data.amountCents,
          currency: ctx.book.currency,
          effectiveFrom: data.effectiveFrom,
          createdBy: ctx.user.id,
        })
        .onConflictDoUpdate({
          target: [budgets.bookId, budgets.effectiveFrom],
          targetWhere: sql`scope = 'overall'`,
          set: { amountCents: data.amountCents, createdBy: ctx.user.id },
        });
    }

    revalidatePath("/");
    revalidatePath("/month");
    revalidatePath("/budgets");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}
