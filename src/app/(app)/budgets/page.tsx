import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import { getBookCategories } from "@/lib/queries/categories";
import { resolveBudget } from "@/lib/queries/budgets";
import { firstOfMonth, parseYearMonth, todayYmd, monthLabel } from "@/lib/dates";
import { BudgetEditor } from "@/components/budget/BudgetEditor";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Orçamentos" };

export default async function BudgetsPage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const { year, month } = parseYearMonth(todayYmd().slice(0, 7));
  const monthStart = firstOfMonth(year, month);

  const [categories, budget] = await Promise.all([
    getBookCategories(ctx.book.id),
    resolveBudget(ctx.book.id, monthStart),
  ]);

  const perCat = new Map(
    budget.perCategory.map((b) => [b.categoryId, b.amountCents]),
  );
  const cats = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    budgetCents: perCat.get(c.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        subtitle={`Em vigor a partir de ${monthLabel(year, month)} (e meses futuros)`}
      />
      <BudgetEditor
        monthStart={monthStart}
        overallCents={budget.overallCents}
        categories={cats}
      />
    </div>
  );
}
