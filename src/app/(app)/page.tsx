import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox, ChevronRight } from "lucide-react";
import { getActiveBook } from "@/lib/queries/active-book";
import {
  getMonthSummary,
  getMonthCategoryTotals,
  getRecentTransactions,
  getPendingCount,
} from "@/lib/queries/transactions";
import { resolveBudget } from "@/lib/queries/budgets";
import { firstOfMonth, monthLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { BudgetGauge } from "@/components/dashboard/BudgetGauge";
import { CategoryDonut } from "@/components/dashboard/CategoryDonut";
import { TransactionRow } from "@/components/expense/TransactionRow";

export default async function HomePage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = firstOfMonth(year, month);
  const currency = ctx.book.currency;

  const [summary, catTotals, budget, recent, pending] = await Promise.all([
    getMonthSummary(ctx.book.id, year, month),
    getMonthCategoryTotals(ctx.book.id, year, month),
    resolveBudget(ctx.book.id, monthStart),
    getRecentTransactions(ctx.book.id, 5),
    getPendingCount(ctx.book.id),
  ]);

  const firstName = ctx.user.name?.split(" ")[0] ?? "";
  const saved =
    budget.overallCents != null ? budget.overallCents - summary.spentCents : null;

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
  const safeToSpend =
    budget.overallCents != null
      ? Math.max(0, Math.round((budget.overallCents - summary.spentCents) / daysLeft))
      : null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm capitalize text-muted">{monthLabel(year, month)}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá{firstName ? `, ${firstName}` : ""}
        </h1>
      </header>

      {pending > 0 && (
        <Link
          href="/inbox"
          className="flex items-center justify-between rounded-2xl border border-hairline bg-surface px-4 py-3 transition hover:bg-surface-2"
        >
          <span className="flex items-center gap-2.5 text-sm font-medium">
            <Inbox className="h-4 w-4 text-brand" />
            {pending} {pending === 1 ? "movimento" : "movimentos"} a aguardar categoria
          </span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
      )}

      <div className="flex flex-col items-center gap-5 rounded-3xl border border-hairline bg-surface p-6">
        <BudgetGauge
          spentCents={summary.spentCents}
          budgetCents={budget.overallCents}
          currency={currency}
        />
        <div className="grid w-full grid-cols-3 divide-x divide-hairline text-center">
          <Stat label="Gasto" value={formatMoney(summary.spentCents, currency)} />
          <Stat
            label="Orçamento"
            value={
              budget.overallCents != null
                ? formatMoney(budget.overallCents, currency)
                : "—"
            }
          />
          <Stat
            label="Poupado"
            value={saved != null ? formatMoney(saved, currency) : "—"}
            tone={saved != null ? (saved >= 0 ? "good" : "over") : undefined}
          />
        </div>
        {safeToSpend != null && safeToSpend > 0 && (
          <p className="text-xs text-muted">
            Podes gastar{" "}
            <span className="font-semibold text-fg">
              {formatMoney(safeToSpend, currency)}
            </span>
            /dia até ao fim do mês
          </p>
        )}
        {summary.incomeCents > 0 && (
          <p className="text-xs text-muted">
            Entradas:{" "}
            <span className="font-semibold" style={{ color: "var(--good)" }}>
              +{formatMoney(summary.incomeCents, currency)}
            </span>
          </p>
        )}
      </div>

      {budget.overallCents == null && (
        <Link
          href="/budgets"
          className="block rounded-2xl border border-dashed border-hairline px-4 py-3 text-center text-sm text-muted transition hover:bg-surface-2"
        >
          Define um orçamento para veres quanto podes gastar
        </Link>
      )}

      {catTotals.some((c) => c.netCents > 0) && (
        <section className="rounded-3xl border border-hairline bg-surface p-5">
          <h2 className="mb-4 text-sm font-medium text-muted">
            Onde foi o dinheiro
          </h2>
          <CategoryDonut items={catTotals} currency={currency} />
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-medium text-muted">Recentes</h2>
          <Link href="/transactions" className="text-xs text-muted hover:text-fg">
            Ver tudo
          </Link>
        </div>
        {recent.length > 0 ? (
          <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-3">
            {recent.map((t) => (
              <TransactionRow key={t.id} tx={t} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-hairline px-4 py-8 text-center text-sm text-muted">
            Ainda sem movimentos.{" "}
            <Link href="/add" className="text-fg underline underline-offset-2">
              Adiciona o primeiro
            </Link>
            .
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "over";
}) {
  return (
    <div className="px-2">
      <p className="text-xs text-muted">{label}</p>
      <p
        className="mt-1 font-mono text-sm font-semibold tabular-nums"
        style={
          tone ? { color: tone === "good" ? "var(--good)" : "var(--over)" } : undefined
        }
      >
        {value}
      </p>
    </div>
  );
}
