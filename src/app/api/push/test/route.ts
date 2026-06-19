import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession();
  if (!session)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await sendPushToUser(session.user.id, {
    title: "Saldo",
    body: "Notifications on ✓",
    url: "/",
  });
  return NextResponse.json({ ok: true });
}
