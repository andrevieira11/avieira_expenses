"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { splits, splitParticipants, transactions } from "@/db/schema";
import { getActiveBook } from "@/lib/queries/active-book";
import { todayYmd } from "@/lib/dates";

export type ActionResult = { ok: true } | { ok: false; error: string };

const createSchema = z.object({
  title: z.string().trim().min(1).max(80),
  participants: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        shareCents: z.number().int().min(1).max(2_000_000_000),
      }),
    )
    .min(1)
    .max(50),
});

export async function createSplit(
  input: z.infer<typeof createSchema>,
): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Sessão expirada" };
    const data = createSchema.parse(input);
    const total = data.participants.reduce((s, p) => s + p.shareCents, 0);

    const [s] = await db
      .insert(splits)
      .values({
        bookId: ctx.book.id,
        title: data.title,
        totalCents: total,
        createdBy: ctx.user.id,
      })
      .returning({ id: splits.id });

    await db.insert(splitParticipants).values(
      data.participants.map((p) => ({
        splitId: s.id,
        name: p.name,
        shareCents: p.shareCents,
      })),
    );

    revalidatePath("/splits");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

/** Mark a participant as paid -> records the money as income in the active book. */
export async function markParticipantPaid(
  participantId: string,
): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Sessão expirada" };

    const [row] = await db
      .select({
        id: splitParticipants.id,
        name: splitParticipants.name,
        shareCents: splitParticipants.shareCents,
        paid: splitParticipants.paid,
        title: splits.title,
        bookId: splits.bookId,
      })
      .from(splitParticipants)
      .innerJoin(splits, eq(splits.id, splitParticipants.splitId))
      .where(eq(splitParticipants.id, participantId))
      .limit(1);
    if (!row || row.bookId !== ctx.book.id)
      return { ok: false, error: "Não encontrado" };
    if (row.paid) return { ok: true };

    const [tx] = await db
      .insert(transactions)
      .values({
        bookId: ctx.book.id,
        amountCents: -row.shareCents, // money in
        currency: ctx.book.currency,
        type: "income",
        status: "confirmed",
        source: "manual",
        txDate: todayYmd(),
        merchant: row.name,
        note: `Acerto: ${row.title}`,
        createdBy: ctx.user.id,
      })
      .returning({ id: transactions.id });

    await db
      .update(splitParticipants)
      .set({ paid: true, txId: tx.id })
      .where(eq(splitParticipants.id, participantId));

    revalidatePath("/splits");
    revalidatePath("/");
    revalidatePath("/month");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function markParticipantUnpaid(
  participantId: string,
): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Sessão expirada" };

    const [row] = await db
      .select({
        txId: splitParticipants.txId,
        bookId: splits.bookId,
      })
      .from(splitParticipants)
      .innerJoin(splits, eq(splits.id, splitParticipants.splitId))
      .where(eq(splitParticipants.id, participantId))
      .limit(1);
    if (!row || row.bookId !== ctx.book.id)
      return { ok: false, error: "Não encontrado" };

    if (row.txId) {
      await db
        .delete(transactions)
        .where(
          and(
            eq(transactions.id, row.txId),
            eq(transactions.bookId, ctx.book.id),
          ),
        );
    }
    await db
      .update(splitParticipants)
      .set({ paid: false, txId: null })
      .where(eq(splitParticipants.id, participantId));

    revalidatePath("/splits");
    revalidatePath("/");
    revalidatePath("/month");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function deleteSplit(id: string): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Sessão expirada" };
    // Participants cascade; any income already recorded stays (real money received).
    await db
      .delete(splits)
      .where(and(eq(splits.id, id), eq(splits.bookId, ctx.book.id)));
    revalidatePath("/splits");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}
