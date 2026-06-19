import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { books } from "@/db/schema";
import { syncBook } from "@/lib/banking/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Token-gated endpoint for a cron to pull bank transactions for every book.
function tokenOk(req: NextRequest): boolean {
  const expected = process.env.INGEST_WEBHOOK_TOKEN;
  if (!expected) return false;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!tokenOk(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allBooks = await db
    .select({ id: books.id, ownerId: books.ownerId, currency: books.currency })
    .from(books)
    .orderBy(asc(books.createdAt));

  let imported = 0;
  for (const b of allBooks) {
    try {
      imported += await syncBook(b.id, b.ownerId, b.currency);
    } catch {
      // keep going for other books
    }
  }
  return NextResponse.json({ ok: true, imported });
}
