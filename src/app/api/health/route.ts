import { NextResponse } from "next/server";

// Cheap liveness probe for Docker/Caddy healthchecks. No DB dependency on purpose:
// it reports that the app process is up and serving.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, service: "saldo" });
}
