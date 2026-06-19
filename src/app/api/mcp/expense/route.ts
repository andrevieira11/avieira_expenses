import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, or, ilike } from "drizzle-orm";
import { db } from "@/db/client";
import { transactions, categories, subcategories } from "@/db/schema";
import { apiTokenOk, resolveDefaultBook } from "@/lib/mcp-api";
import { todayYmd } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  amount: z.number().positive(),
  type: z.enum(["expense", "refund"]).default("expense"),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().max(500).optional(),
  merchant: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  if (!apiTokenOk(req))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const book = await resolveDefaultBook();
  if (!book) return NextResponse.json({ error: "no_book" }, { status: 409 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "bad request", detail: parsed.error.flatten() },
      { status: 400 },
    );
  const d = parsed.data;

  let categoryId: string | null = null;
  let subcategoryId: string | null = null;
  if (d.category) {
    const [c] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.bookId, book.id),
          or(ilike(categories.slug, d.category), ilike(categories.name, d.category)),
        ),
      )
      .limit(1);
    if (!c)
      return NextResponse.json(
        { error: `categoria "${d.category}" não encontrada` },
        { status: 400 },
      );
    categoryId = c.id;
    if (d.subcategory) {
      const [s] = await db
        .select({ id: subcategories.id })
        .from(subcategories)
        .where(
          and(
            eq(subcategories.categoryId, categoryId),
            or(
              ilike(subcategories.slug, d.subcategory),
              ilike(subcategories.name, d.subcategory),
            ),
          ),
        )
        .limit(1);
      if (s) subcategoryId = s.id;
    }
  }

  const cents = Math.round(d.amount * 100);
  const amountCents = d.type === "refund" ? -cents : cents;

  const [tx] = await db
    .insert(transactions)
    .values({
      bookId: book.id,
      amountCents,
      currency: book.currency,
      type: d.type,
      status: "confirmed",
      source: "manual",
      txDate: d.date ?? todayYmd(),
      categoryId,
      subcategoryId,
      merchant: d.merchant ?? null,
      note: d.note ?? null,
      createdBy: book.ownerId,
    })
    .returning({ id: transactions.id });

  return NextResponse.json({ ok: true, id: tx.id });
}
