import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { budgetHealthVar } from "@/lib/colors";

export function MonthSummary({
  spentCents,
  budgetCents,
  count,
  currency,
}: {
  spentCents: number;
  budgetCents: number | null;
  count: number;
  currency: string;
}) {
  const hasBudget = budgetCents != null && budgetCents > 0;
  const savedCents = hasBudget ? budgetCents - spentCents : null;
  const ratio = hasBudget ? spentCents / budgetCents : 0;
  const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));

  return (
    <div className="rounded-3xl border border-hairline bg-surface p-5">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">Gasto este mês</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
            {formatMoney(spentCents, currency)}
          </p>
        </div>
        {hasBudget && (
          <div className="shrink-0 text-right">
            <p className="text-sm text-muted">
              {savedCents! >= 0 ? "Poupado" : "Acima"}
            </p>
            <p
              className="mt-1 font-mono text-lg font-semibold tabular-nums"
              style={{ color: savedCents! >= 0 ? "var(--good)" : "var(--over)" }}
            >
              {formatMoney(Math.abs(savedCents!), currency)}
            </p>
          </div>
        )}
      </div>

      {hasBudget ? (
        <div className="mt-4">
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: budgetHealthVar(ratio) }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted">
            <span>
              {count} {count === 1 ? "movimento" : "movimentos"}
            </span>
            <span>Orçamento {formatMoney(budgetCents, currency)}</span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">
          {count} {count === 1 ? "movimento" : "movimentos"} ·{" "}
          <Link href="/budgets" className="underline underline-offset-2">
            Define um orçamento
          </Link>
        </p>
      )}
    </div>
  );
}
