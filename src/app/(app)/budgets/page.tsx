import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import { getBookCategories } from "@/lib/queries/categories";
import { resolveBudget } from "@/lib/queries/budgets";
import {
  getMonthCategoryTotals,
  getMonthSummary,
} from "@/lib/queries/transactions";
import { firstOfMonth, parseYearMonth, todayYmd, monthLabel } from "@/lib/dates";
import { BudgetEditor } from "@/components/budget/BudgetEditor";
import { PlafondView } from "@/components/budget/PlafondView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Orçamentos" };

export default async function BudgetsPage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const { year, month } = parseYearMonth(todayYmd().slice(0, 7));
  const monthStart = firstOfMonth(year, month);

  const [categories, budget, catTotals, summary] = await Promise.all([
    getBookCategories(ctx.book.id),
    resolveBudget(ctx.book.id, monthStart),
    getMonthCategoryTotals(ctx.book.id, year, month),
    getMonthSummary(ctx.book.id, year, month),
  ]);

  const perCat = new Map(
    budget.perCategory.map((b) => [b.categoryId, b.amountCents]),
  );
  const spentByCat = new Map(catTotals.map((c) => [c.categoryId, c.netCents]));
  const catInfo = new Map(categories.map((c) => [c.id, c]));

  const cats = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    budgetCents: perCat.get(c.id) ?? null,
  }));

  const plafondCats = budget.perCategory.map((b) => {
    const info = catInfo.get(b.categoryId);
    return {
      name: info?.name ?? "—",
      color: info?.color,
      budgetCents: b.amountCents,
      spentCents: spentByCat.get(b.categoryId) ?? 0,
    };
  });
  const overall =
    budget.overallCents != null
      ? {
          name: "Total",
          budgetCents: budget.overallCents,
          spentCents: summary.spentCents,
        }
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        subtitle={`Em vigor a partir de ${monthLabel(year, month)} (e meses futuros)`}
      />
      <PlafondView
        overall={overall}
        categories={plafondCats}
        currency={ctx.book.currency}
      />
      <BudgetEditor
        monthStart={monthStart}
        overallCents={budget.overallCents}
        categories={cats}
      />
    </div>
  );
}
