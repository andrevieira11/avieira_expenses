"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { bankConnections } from "@/db/schema";
import { getActiveBook } from "@/lib/queries/active-book";
import {
  gcConfigured,
  listInstitutions,
  createAgreement,
  createRequisition,
} from "@/lib/banking/gocardless";
import { syncBook } from "@/lib/banking/sync";

export async function getInstitutions() {
  if (!gcConfigured()) return { ok: false as const, error: "not_configured" };
  try {
    const list = await listInstitutions("PT");
    return {
      ok: true as const,
      institutions: list.map((i) => ({ id: i.id, name: i.name, logo: i.logo })),
    };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "error" };
  }
}

export async function connectBank(
  institutionId: string,
  institutionName: string,
) {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false as const, error: "Session expired" };
    if (!gcConfigured())
      return { ok: false as const, error: "GoCardless not configured" };

    const reference = createId();
    const agreement = await createAgreement(institutionId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const req = await createRequisition({
      institutionId,
      agreementId: agreement.id,
      redirect: `${appUrl}/api/banking/callback`,
      reference,
    });

    await db.insert(bankConnections).values({
      bookId: ctx.book.id,
      institutionId,
      institutionName,
      requisitionId: req.id,
      reference,
      agreementId: agreement.id,
      status: "created",
    });

    return { ok: true as const, link: req.link };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "error" };
  }
}

export async function syncNow() {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false as const, error: "Session expired" };
    const imported = await syncBook(ctx.book.id, ctx.user.id, ctx.book.currency);
    revalidatePath("/inbox");
    revalidatePath("/settings");
    return { ok: true as const, imported };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "error" };
  }
}

export async function disconnectBank(connectionId: string) {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false as const, error: "Session expired" };
    await db
      .delete(bankConnections)
      .where(
        and(
          eq(bankConnections.id, connectionId),
          eq(bankConnections.bookId, ctx.book.id),
        ),
      );
    revalidatePath("/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "error" };
  }
}
