"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { savingsGoals } from "@/db/schema";
import { getActiveBook } from "@/lib/queries/active-book";

export type ActionResult = { ok: true } | { ok: false; error: string };

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  targetCents: z.number().int().min(1).max(2_000_000_000),
});

export async function createGoal(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Sessão expirada" };
    const data = createSchema.parse(input);
    await db.insert(savingsGoals).values({
      bookId: ctx.book.id,
      name: data.name,
      targetCents: data.targetCents,
    });
    revalidatePath("/goals");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function contributeGoal(
  id: string,
  deltaCents: number,
): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Sessão expirada" };
    const delta = z.number().int().parse(deltaCents);
    await db
      .update(savingsGoals)
      .set({
        savedCents: sql`greatest(0, ${savingsGoals.savedCents} + ${delta})`,
      })
      .where(
        and(eq(savingsGoals.id, id), eq(savingsGoals.bookId, ctx.book.id)),
      );
    revalidatePath("/goals");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Sessão expirada" };
    await db
      .delete(savingsGoals)
      .where(
        and(eq(savingsGoals.id, id), eq(savingsGoals.bookId, ctx.book.id)),
      );
    revalidatePath("/goals");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}
