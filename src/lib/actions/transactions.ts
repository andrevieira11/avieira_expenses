"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { transactions, categories, subcategories } from "@/db/schema";
import { getActiveBook } from "@/lib/queries/active-book";
import { learnRule } from "@/lib/queries/rules";
import { resolveBudget } from "@/lib/queries/budgets";
import { getMonthSummary } from "@/lib/queries/transactions";
import { firstOfMonth, parseYearMonth } from "@/lib/dates";
import { sendPushToUser } from "@/lib/push";

const upsertSchema = z.object({
  // Positive magnitude in cents; the server applies the sign from `type`.
  amountCents: z.number().int().min(1).max(2_000_000_000),
  type: z.enum(["expense", "income", "refund"]),
  txDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  categoryId: z.string().min(1).nullable(),
  subcategoryId: z.string().min(1).nullable(),
  merchant: z.string().trim().max(120).nullish(),
  note: z.string().trim().max(500).nullish(),
});

export type UpsertTransactionInput = z.infer<typeof upsertSchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

/** expense -> positive, refund/income -> negative (the money invariant). */
function signedAmount(type: UpsertTransactionInput["type"], magnitude: number) {
  return type === "expense" ? magnitude : -magnitude;
}

/** Ensure the category/subcategory belong to this book (tenant isolation). */
async function assertCategoryInBook(
  bookId: string,
  categoryId: string | null,
  subcategoryId: string | null,
) {
  if (categoryId) {
    const c = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.bookId, bookId)))
      .limit(1);
    if (!c.length) throw new Error("Invalid category");
  }
  if (subcategoryId) {
    const s = await db
      .select({ id: subcategories.id, categoryId: subcategories.categoryId })
      .from(subcategories)
      .where(
        and(eq(subcategories.id, subcategoryId), eq(subcategories.bookId, bookId)),
      )
      .limit(1);
    if (!s.length) throw new Error("Invalid subcategory");
    if (categoryId && s[0].categoryId !== categoryId) {
      throw new Error("Subcategory does not belong to the category");
    }
  }
}

function revalidate() {
  revalidatePath("/");
  revalidatePath("/month");
  revalidatePath("/transactions");
  revalidatePath("/inbox");
}

export async function createTransaction(
  input: UpsertTransactionInput,
): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Session expired" };

    const data = upsertSchema.parse(input);
    await assertCategoryInBook(ctx.book.id, data.categoryId, data.subcategoryId);

    await db.insert(transactions).values({
      bookId: ctx.book.id,
      amountCents: signedAmount(data.type, data.amountCents),
      currency: ctx.book.currency,
      type: data.type,
      status: "confirmed",
      source: "manual",
      txDate: data.txDate,
      categoryId: data.categoryId,
      subcategoryId: data.subcategoryId,
      merchant: data.merchant ?? null,
      note: data.note ?? null,
      createdBy: ctx.user.id,
    });

    await maybeBudgetAlert(ctx.book.id, ctx.user.id, data);

    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/** Push a notification the moment a spend pushes the month over its overall budget. */
async function maybeBudgetAlert(
  bookId: string,
  userId: string,
  data: UpsertTransactionInput,
) {
  try {
    const { year, month } = parseYearMonth(data.txDate);
    const budget = await resolveBudget(bookId, firstOfMonth(year, month));
    if (!budget.overallCents) return;
    const summary = await getMonthSummary(bookId, year, month);
    const after = summary.spentCents;
    const before = after - signedAmount(data.type, data.amountCents);
    if (before <= budget.overallCents && after > budget.overallCents) {
      await sendPushToUser(userId, {
        title: "Budget exceeded",
        body: `You've spent ${(after / 100).toLocaleString("en-IE")} € this month.`,
        url: "/",
      });
    }
  } catch {
    // Never block an expense on a notification problem.
  }
}

export async function updateTransaction(
  id: string,
  input: UpsertTransactionInput,
): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Session expired" };

    const data = upsertSchema.parse(input);
    await assertCategoryInBook(ctx.book.id, data.categoryId, data.subcategoryId);

    const result = await db
      .update(transactions)
      .set({
        amountCents: signedAmount(data.type, data.amountCents),
        type: data.type,
        txDate: data.txDate,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        merchant: data.merchant ?? null,
        note: data.note ?? null,
        // Categorizing a pending capture confirms it.
        status: "confirmed",
      })
      .where(
        and(eq(transactions.id, id), eq(transactions.bookId, ctx.book.id)),
      )
      .returning({
        id: transactions.id,
        externalId: transactions.externalId,
        merchant: transactions.merchant,
      });

    if (!result.length) return { ok: false, error: "Transaction not found" };

    // Merchant memory: teach this merchant / external-id -> category for next time.
    if (data.categoryId) {
      await learnRule(ctx.book.id, {
        externalId: result[0].externalId,
        merchant: result[0].merchant,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
      });
    }

    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Session expired" };

    const result = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.bookId, ctx.book.id)))
      .returning({ id: transactions.id });

    if (!result.length) return { ok: false, error: "Transaction not found" };

    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
