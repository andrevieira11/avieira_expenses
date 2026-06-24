"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { transactions, bankDismissed } from "@/db/schema";
import { getActiveBook } from "@/lib/queries/active-book";

/**
 * Empty the inbox: delete every pending (un-categorized) transaction in the active book.
 * Bank transactions are recorded as "dismissed" by id so sync won't re-add the same ones —
 * but genuinely new transactions (even older-dated, settling late at the bank) still come in.
 */
export async function clearInbox() {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false as const, error: "Session expired" };

    const pending = await db
      .select({ externalId: transactions.externalId })
      .from(transactions)
      .where(
        and(
          eq(transactions.bookId, ctx.book.id),
          eq(transactions.status, "pending_category"),
        ),
      );
    const extIds = pending
      .map((p) => p.externalId)
      .filter((x): x is string => Boolean(x));
    if (extIds.length) {
      await db
        .insert(bankDismissed)
        .values(extIds.map((externalId) => ({ bookId: ctx.book.id, externalId })))
        .onConflictDoNothing();
    }

    const deleted = await db
      .delete(transactions)
      .where(
        and(
          eq(transactions.bookId, ctx.book.id),
          eq(transactions.status, "pending_category"),
        ),
      )
      .returning({ id: transactions.id });

    revalidatePath("/inbox");
    revalidatePath("/");
    return { ok: true as const, cleared: deleted.length };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "error" };
  }
}
