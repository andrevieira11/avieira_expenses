import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bankConnections, bankAccounts } from "@/db/schema";
import { createSession } from "@/lib/banking/enablebanking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Enable Banking redirects here after the user consents, with ?code=...&state=<reference>.
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error") || !code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?bank=error`);
  }

  const [conn] = await db
    .select()
    .from(bankConnections)
    .where(eq(bankConnections.reference, state))
    .limit(1);
  if (!conn) return NextResponse.redirect(`${appUrl}/settings?bank=error`);

  try {
    const session = await createSession(code);
    for (const acc of session.accounts ?? []) {
      const name =
        acc.name ||
        (typeof acc.account_id === "object"
          ? acc.account_id?.iban
          : acc.account_id) ||
        null;
      await db
        .insert(bankAccounts)
        .values({
          bookId: conn.bookId,
          connectionId: conn.id,
          accountId: acc.uid,
          name,
        })
        .onConflictDoNothing();
    }
    await db
      .update(bankConnections)
      .set({ status: "linked", requisitionId: session.session_id })
      .where(eq(bankConnections.id, conn.id));
    return NextResponse.redirect(`${appUrl}/settings?bank=connected`);
  } catch {
    await db
      .update(bankConnections)
      .set({ status: "error" })
      .where(eq(bankConnections.id, conn.id));
    return NextResponse.redirect(`${appUrl}/settings?bank=error`);
  }
}
