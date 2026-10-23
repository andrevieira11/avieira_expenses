import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, ilike, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { books, recurringExpenses } from "@/db/schema";
import { apiTokenOk, resolveDefaultBook } from "@/lib/mcp-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recurring payments due in the next `days` (default 10, max 45) in one book —
 * `book` by name (e.g. BPI), else the default book. Trigger reads it to say how
 * much must be in the account before the debits.
 */
export async function GET(req: NextRequest) {
  if (!apiTokenOk(req))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const def = await resolveDefaultBook();
  if (!def) return NextResponse.json({ error: "no_book" }, { status: 409 });

  const params = new URL(req.url).searchParams;
  const name = params.get("book")?.trim();
  const [book] = name
    ? await db
        .select({ id: books.id, name: books.name, currency: books.currency })
        .from(books)
        .where(and(eq(books.ownerId, def.ownerId), ilike(books.name, name)))
        .limit(1)
    : await db
        .select({ id: books.id, name: books.name, currency: books.currency })
        .from(books)
        .where(eq(books.id, def.id));
  if (!book) return NextResponse.json({ error: "no_book" }, { status: 404 });

  const raw = Number(params.get("days"));
  const days = Math.min(45, Number.isFinite(raw) && raw > 0 ? raw : 10);
  const until = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  const rows = await db
    .select({
      name: recurringExpenses.name,
      amountCents: recurringExpenses.amountCents,
      nextDue: recurringExpenses.nextDue,
    })
    .from(recurringExpenses)
    .where(
      and(
        eq(recurringExpenses.bookId, book.id),
        eq(recurringExpenses.isActive, true),
        lte(recurringExpenses.nextDue, until),
      ),
    )
    .orderBy(asc(recurringExpenses.nextDue));

  const total = rows.reduce((s, r) => s + r.amountCents, 0);
  return NextResponse.json({
    book: book.name,
    currency: book.currency,
    until,
    total_eur: total / 100,
    payments: rows.map((r) => ({
      name: r.name,
      amount_eur: r.amountCents / 100,
      due: r.nextDue,
    })),
  });
}
