import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { transactions } from "@/db/schema";
import { getActiveBook } from "@/lib/queries/active-book";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";
const MAX = 8 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export async function POST(req: NextRequest) {
  const ctx = await getActiveBook();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const txId = form.get("transactionId");
  const file = form.get("file");
  if (typeof txId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: "unsupported type" }, { status: 415 });
  }

  const [tx] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, txId), eq(transactions.bookId, ctx.book.id)))
    .limit(1);
  if (!tx) return NextResponse.json({ error: "not found" }, { status: 404 });

  await mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${createId()}.${ext}`;
  await writeFile(join(UPLOADS_DIR, filename), Buffer.from(await file.arrayBuffer()));

  await db
    .update(transactions)
    .set({ receiptPath: filename })
    .where(eq(transactions.id, txId));

  return NextResponse.json({ ok: true });
}
