"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { transactions, bankAccounts } from "@/db/schema";
import { getActiveBook } from "@/lib/queries/active-book";

/**
 * Empty the inbox: delete every pending (un-categorized) transaction in the active book.
 * Also bumps each linked bank account's sync floor to now, so the cleared bank
 * transactions don't reappear on the next sync — you keep only new spends going forward.
 */
export async function clearInbox() {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false as const, error: "Session expired" };

    const deleted = await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.bookId, ctx.book.id),
          eq(transactions.status, "pending_category"),
        ),
      )
      .returning({ id: transactions.id });

    await db
      .update(bankAccounts)
      .set({ syncFrom: new Date() })
      .where(eq(bankAccounts.bookId, ctx.book.id));

    revalidatePath("/inbox");
    revalidatePath("/");
    return { ok: true as const, cleared: deleted.length };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "error" };
  }
}
