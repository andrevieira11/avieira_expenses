"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { recurringExpenses, transactions, categories } from "@/db/schema";
import { getActiveBook } from "@/lib/queries/active-book";
import { advanceDate, todayYmd, type Cadence } from "@/lib/dates";

export type ActionResult = { ok: true } | { ok: false; error: string };

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amountCents: z.number().int().min(1).max(2_000_000_000),
  cadence: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  intervalCount: z.number().int().min(1).max(60).default(1),
  nextDue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.string().min(1).nullable(),
  subcategoryId: z.string().min(1).nullable(),
});

export async function createRecurring(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Session expired" };
    const data = createSchema.parse(input);

    if (data.categoryId) {
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
      if (!c.length) return { ok: false, error: "Invalid category" };
    }

    await db.insert(recurringExpenses).values({
      bookId: ctx.book.id,
      name: data.name,
      amountCents: data.amountCents,
      currency: ctx.book.currency,
      cadence: data.cadence,
      intervalCount: data.intervalCount,
      nextDue: data.nextDue,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
    });
    revalidatePath("/subscriptions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteRecurring(id: string): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Session expired" };
    await db
      .delete(recurringExpenses)
      .where(
        and(
          eq(recurringExpenses.id, id),
          eq(recurringExpenses.bookId, ctx.book.id),
        ),
      );
    revalidatePath("/subscriptions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/** Log this renewal as an expense and roll next_due forward by its cadence. */
export async function payRecurring(id: string): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Session expired" };

    const [r] = await db
      .select()
      .from(recurringExpenses)
      .where(
        and(
          eq(recurringExpenses.id, id),
          eq(recurringExpenses.bookId, ctx.book.id),
        ),
      )
      .limit(1);
    if (!r) return { ok: false, error: "Subscription not found" };

    await db.insert(transactions).values({
      bookId: ctx.book.id,
      amountCents: r.amountCents,
      currency: r.currency,
      type: "expense",
      status: "confirmed",
      source: "manual",
      txDate: todayYmd(),
      categoryId: r.categoryId,
      subcategoryId: r.subcategoryId,
      merchant: r.name,
      createdBy: ctx.user.id,
    });

    await db
      .update(recurringExpenses)
      .set({
        nextDue: advanceDate(r.nextDue, r.cadence as Cadence, r.intervalCount),
      })
      .where(eq(recurringExpenses.id, id));

    revalidatePath("/subscriptions");
    revalidatePath("/");
    revalidatePath("/month");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
