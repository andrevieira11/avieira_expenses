import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { books, ingestEvents, transactions } from "@/db/schema";
import { parseMoeyNotification } from "@/lib/moey/parser";
import { findRule } from "@/lib/queries/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  raw_text: z.string().min(1).max(2000),
  external_id: z.string().max(200).optional(),
  source: z
    .enum(["ios_share", "ios_manual", "ios_automation", "api"])
    .optional(),
  received_at: z.string().optional(),
  client_dedupe_key: z.string().max(200).optional(),
});

function tokenOk(req: NextRequest): boolean {
  const expected = process.env.INGEST_WEBHOOK_TOKEN;
  if (!expected) return false;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export async function POST(req: NextRequest) {
  if (!tokenOk(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "raw_text required" }, { status: 400 });
  }
  const { raw_text, external_id, source, received_at, client_dedupe_key } =
    parsed.data;

  // Single-user: the oldest book is the target. (Multi-user later: map token -> book.)
  const [book] = await db
    .select({ id: books.id, ownerId: books.ownerId })
    .from(books)
    .orderBy(asc(books.createdAt))
    .limit(1);
  if (!book) return NextResponse.json({ error: "no_book" }, { status: 409 });

  const receivedAt = received_at ? new Date(received_at) : new Date();
  const result = parseMoeyNotification(raw_text);

  const dedupeKey =
    client_dedupe_key ??
    createHash("sha256")
      .update(
        `${book.id}|${external_id ?? ""}|${raw_text.toLowerCase().replace(/\s+/g, " ").trim()}|${ymd(receivedAt)}`,
      )
      .digest("hex");

  const existing = await db
    .select({ id: ingestEvents.id })
    .from(ingestEvents)
    .where(eq(ingestEvents.dedupeKey, dedupeKey))
    .limit(1);
  if (existing.length) {
    return NextResponse.json({ ok: true, deduped: true }, { status: 200 });
  }

  const [event] = await db
    .insert(ingestEvents)
    .values({
      bookId: book.id,
      dedupeKey,
      source: source ?? "ios_share",
      rawText: raw_text,
      externalId: external_id ?? null,
      payload: json as Record<string, unknown>,
      receivedAt,
      parseOk: result.parseOk,
      parsedAmountCents: result.amountCents,
      parsedMerchant: result.merchant,
      parsedType: result.type,
    })
    .returning({ id: ingestEvents.id });

  if (result.ignored) {
    return NextResponse.json(
      { ok: true, ignored: true, eventId: event.id },
      { status: 202 },
    );
  }

  // Auto-categorize from a learned rule (external id wins over merchant text).
  const rule = await findRule(book.id, {
    externalId: external_id ?? null,
    merchant: result.merchant,
  });

  const type = result.type ?? "expense";
  const amountCents =
    result.amountCents == null
      ? null
      : type === "refund"
        ? -result.amountCents
        : result.amountCents;

  const [tx] = await db
    .insert(transactions)
    .values({
      bookId: book.id,
      amountCents,
      currency: result.currency,
      type,
      status: "pending_category",
      source: "moey",
      txDate: result.occurredAt ?? ymd(receivedAt),
      categoryId: rule?.categoryId ?? null,
      subcategoryId: rule?.subcategoryId ?? null,
      merchant: result.merchant,
      rawText: raw_text,
      externalId: external_id ?? null,
      sourceEventId: event.id,
      createdBy: book.ownerId,
    })
    .returning({ id: transactions.id });

  return NextResponse.json(
    {
      ok: true,
      parsed: result.parseOk,
      matched: rule != null,
      transactionId: tx.id,
      status: "pending_category",
    },
    { status: 201 },
  );
}
