import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import {
  getYearMonthlyTotals,
  getYearCategoryTotals,
} from "@/lib/queries/transactions";
import { CategoryBreakdown } from "@/components/month/CategoryBreakdown";
import { YearBars } from "@/components/year/YearBars";
import { YearNav } from "@/components/year/YearNav";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Ano" };

export default async function YearPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>;
}) {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const sp = await searchParams;
  const year =
    sp.y && /^\d{4}$/.test(sp.y) ? Number(sp.y) : new Date().getFullYear();

  const [monthly, catTotals] = await Promise.all([
    getYearMonthlyTotals(ctx.book.id, year),
    getYearCategoryTotals(ctx.book.id, year),
  ]);

  const total = monthly.reduce((s, m) => s + m.netCents, 0);
  const activeMonths = monthly.filter((m) => m.netCents > 0).length || 1;

  return (
    <div className="space-y-6">
      <YearNav year={year} />
      <div className="rounded-3xl border border-hairline bg-surface p-5">
        <p className="text-sm text-muted">Total gasto em {year}</p>
        <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
          {formatMoney(total, ctx.book.currency)}
        </p>
        <p className="mt-1 text-xs text-muted">
          média {formatMoney(Math.round(total / activeMonths), ctx.book.currency)}
          /mês
        </p>
      </div>
      <YearBars year={year} data={monthly} />
      <CategoryBreakdown items={catTotals} currency={ctx.book.currency} />
    </div>
  );
}
