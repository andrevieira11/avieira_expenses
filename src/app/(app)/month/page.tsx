import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import {
  getMonthSummary,
  getMonthCategoryTotals,
  getMonthTransactions,
} from "@/lib/queries/transactions";
import { getBookCategories } from "@/lib/queries/categories";
import { resolveBudget } from "@/lib/queries/budgets";
import { parseYearMonth, todayYmd, firstOfMonth } from "@/lib/dates";
import { MonthNav } from "@/components/month/MonthNav";
import { MonthSummary } from "@/components/month/MonthSummary";
import { CategoryBreakdown } from "@/components/month/CategoryBreakdown";
import { EditableTransactionList } from "@/components/expense/EditableTransactionList";

export const metadata = { title: "Mês" };

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const sp = await searchParams;
  const ym = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : todayYmd().slice(0, 7);
  const { year, month } = parseYearMonth(ym);

  const [summary, catTotals, txs, categories, budget] = await Promise.all([
    getMonthSummary(ctx.book.id, year, month),
    getMonthCategoryTotals(ctx.book.id, year, month),
    getMonthTransactions(ctx.book.id, year, month),
    getBookCategories(ctx.book.id),
    resolveBudget(ctx.book.id, firstOfMonth(year, month)),
  ]);

  return (
    <div className="space-y-6">
      <MonthNav year={year} month={month} />
      <MonthSummary
        spentCents={summary.netCents}
        budgetCents={budget.overallCents}
        count={summary.count}
        currency={ctx.book.currency}
      />
      <CategoryBreakdown items={catTotals} currency={ctx.book.currency} />
      <EditableTransactionList
        transactions={txs}
        categories={categories}
        currency={ctx.book.currency}
        emptyHint="Adiciona a tua primeira despesa deste mês."
      />
    </div>
  );
}
