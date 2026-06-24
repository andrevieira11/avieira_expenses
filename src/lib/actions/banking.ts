"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { bankConnections, books } from "@/db/schema";
import { getActiveBook } from "@/lib/queries/active-book";
import { ebConfigured, listAspsps, startAuth } from "@/lib/banking/enablebanking";
import { syncBook } from "@/lib/banking/sync";

const COUNTRY = "PT";

export async function getInstitutions() {
  if (!ebConfigured()) return { ok: false as const, error: "not_configured" };
  try {
    const list = await listAspsps(COUNTRY);
    // Enable Banking identifies a bank by name + country, so the name is the id.
    return {
      ok: true as const,
      institutions: list.map((a) => ({
        id: a.name,
        name: a.name,
        logo: a.logo,
      })),
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
    if (!ebConfigured())
      return { ok: false as const, error: "Enable Banking not configured" };

    const reference = createId(); // correlates the redirect (returned as ?state=)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const auth = await startAuth({
      aspspName: institutionId,
      country: COUNTRY,
      redirectUrl: `${appUrl}/api/banking/callback`,
      state: reference,
    });

    await db.insert(bankConnections).values({
      bookId: ctx.book.id,
      institutionId,
      institutionName,
      requisitionId: auth.authorization_id, // becomes the session_id after consent
      reference,
      agreementId: auth.authorization_id,
      status: "created",
    });

    return { ok: true as const, link: auth.url };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "error" };
  }
}

export async function syncNow() {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false as const, error: "Session expired" };
    const imported = await syncBook(
      ctx.book.id,
      ctx.user.id,
      ctx.book.currency,
      { force: true }, // user pressed the button — bypass the cooldown
    );
    revalidatePath("/inbox");
    revalidatePath("/settings");
    return { ok: true as const, imported };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "error" };
  }
}

/** Opportunistic sync when the app opens/foregrounds — respects the per-account cooldown
 *  so it never trips the bank's daily access cap. Silent on failure. */
export async function syncOnOpen() {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false as const, error: "no_session" };
    const imported = await syncBook(ctx.book.id, ctx.user.id, ctx.book.currency);
    if (imported > 0) {
      revalidatePath("/inbox");
      revalidatePath("/");
    }
    return { ok: true as const, imported };
  } catch {
    return { ok: false as const, error: "sync_failed" };
  }
}

/** Recovery: pull the full ~90-day window the bank exposes, ignoring the sync floor and
 *  anything previously cleared/deleted. Use when a transaction is missing. */
export async function importHistory() {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false as const, error: "Session expired" };
    const stats = { fetched: 0 };
    const imported = await syncBook(
      ctx.book.id,
      ctx.user.id,
      ctx.book.currency,
      { fromOverrideDays: 90, ignoreDismissed: true, force: true },
      stats,
    );
    revalidatePath("/inbox");
    revalidatePath("/settings");
    return { ok: true as const, imported, fetched: stats.fetched };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "error" };
  }
}

export async function setAutoSync(enabled: boolean) {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false as const, error: "Session expired" };
    await db
      .update(books)
      .set({ autoSync: enabled })
      .where(eq(books.id, ctx.book.id));
    revalidatePath("/settings");
    return { ok: true as const };
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
