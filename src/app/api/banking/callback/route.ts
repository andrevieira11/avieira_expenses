import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bankConnections, bankAccounts } from "@/db/schema";
import { getRequisition } from "@/lib/banking/gocardless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GoCardless redirects here after the user consents, appending ?ref=<reference>.
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const ref = new URL(req.url).searchParams.get("ref");
  if (!ref) return NextResponse.redirect(`${appUrl}/settings?bank=error`);

  const [conn] = await db
    .select()
    .from(bankConnections)
    .where(eq(bankConnections.reference, ref))
    .limit(1);
  if (!conn) return NextResponse.redirect(`${appUrl}/settings?bank=error`);

  try {
    const requisition = await getRequisition(conn.requisitionId);
    for (const accountId of requisition.accounts) {
      await db
        .insert(bankAccounts)
        .values({ bookId: conn.bookId, connectionId: conn.id, accountId })
        .onConflictDoNothing();
    }
    await db
      .update(bankConnections)
      .set({ status: "linked" })
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
