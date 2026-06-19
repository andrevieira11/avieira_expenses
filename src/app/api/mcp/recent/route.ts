import { NextRequest, NextResponse } from "next/server";
import { apiTokenOk, resolveDefaultBook } from "@/lib/mcp-api";
import { getRecentTransactions } from "@/lib/queries/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!apiTokenOk(req))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const book = await resolveDefaultBook();
  if (!book) return NextResponse.json({ error: "no_book" }, { status: 409 });

  const raw = Number(new URL(req.url).searchParams.get("limit"));
  const limit = Math.min(50, Number.isFinite(raw) && raw > 0 ? raw : 10);
  const txs = await getRecentTransactions(book.id, limit);

  return NextResponse.json(
    txs.map((t) => ({
      date: t.txDate,
      amount_eur: t.amountCents != null ? t.amountCents / 100 : null,
      category: t.categoryName,
      subcategory: t.subcategoryName,
      merchant: t.merchant,
      note: t.note,
    })),
  );
}
