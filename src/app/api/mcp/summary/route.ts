import { NextRequest, NextResponse } from "next/server";
import { apiTokenOk, resolveDefaultBook } from "@/lib/mcp-api";
import {
  getMonthSummary,
  getMonthCategoryTotals,
} from "@/lib/queries/transactions";
import { resolveBudget } from "@/lib/queries/budgets";
import { firstOfMonth, parseYearMonth } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!apiTokenOk(req))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const book = await resolveDefaultBook();
  if (!book) return NextResponse.json({ error: "no_book" }, { status: 409 });

  const monthParam = new URL(req.url).searchParams.get("month");
  const now = new Date();
  const ym =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { year, month } = parseYearMonth(ym);

  const [summary, budget, cats] = await Promise.all([
    getMonthSummary(book.id, year, month),
    resolveBudget(book.id, firstOfMonth(year, month)),
    getMonthCategoryTotals(book.id, year, month),
  ]);

  const eur = (c: number) => Math.round(c) / 100;
  return NextResponse.json({
    month: ym,
    currency: book.currency,
    spent_eur: eur(summary.netCents),
    budget_eur: budget.overallCents != null ? eur(budget.overallCents) : null,
    saved_eur:
      budget.overallCents != null
        ? eur(budget.overallCents - summary.netCents)
        : null,
    transactions: summary.count,
    top_categories: cats
      .filter((c) => c.netCents > 0)
      .slice(0, 5)
      .map((c) => ({ category: c.name, eur: eur(c.netCents) })),
  });
}
