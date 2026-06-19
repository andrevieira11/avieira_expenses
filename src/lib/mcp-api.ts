import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { books } from "@/db/schema";

/** Bearer-token auth for the machine API (MCP). Reuses the personal INGEST token. */
export function apiTokenOk(req: NextRequest): boolean {
  const expected = process.env.INGEST_WEBHOOK_TOKEN;
  if (!expected) return false;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Single-user: the oldest book is the default target. */
export async function resolveDefaultBook() {
  const [book] = await db
    .select({
      id: books.id,
      ownerId: books.ownerId,
      currency: books.currency,
    })
    .from(books)
    .orderBy(asc(books.createdAt))
    .limit(1);
  return book ?? null;
}
