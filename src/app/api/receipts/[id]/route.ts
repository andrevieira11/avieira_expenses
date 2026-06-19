import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { transactions } from "@/db/schema";
import { getActiveBook } from "@/lib/queries/active-book";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "./uploads";
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getActiveBook();
  if (!ctx) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const [tx] = await db
    .select({ receiptPath: transactions.receiptPath })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.bookId, ctx.book.id)))
    .limit(1);

  const name = tx?.receiptPath;
  // Guard against path traversal — only a bare filename is valid.
  if (!name || /[\\/]|\.\./.test(name)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const buf = await readFile(join(UPLOADS_DIR, name));
    const ct = TYPES[extname(name)] ?? "application/octet-stream";
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": ct, "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
