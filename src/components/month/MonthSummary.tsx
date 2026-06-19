import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { budgetHealthVar } from "@/lib/colors";

export function MonthSummary({
  spentCents,
  incomeCents,
  budgetCents,
  count,
  currency,
}: {
  spentCents: number;
  incomeCents: number;
  budgetCents: number | null;
  count: number;
  currency: string;
}) {
  const hasBudget = budgetCents != null && budgetCents > 0;
  const savedCents = hasBudget ? budgetCents - spentCents : null;
  const ratio = hasBudget ? spentCents / budgetCents : 0;
  const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  const hasIncome = incomeCents > 0;

  return (
    <div className="rounded-3xl border border-hairline bg-surface p-5">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">Spent this month</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
            {formatMoney(spentCents, currency)}
          </p>
        </div>
        {hasBudget && (
          <div className="shrink-0 text-right">
            <p className="text-sm text-muted">
              {savedCents! >= 0 ? "Saved" : "Over"}
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
              {count} {count === 1 ? "transaction" : "transactions"}
            </span>
            <span>Budget {formatMoney(budgetCents, currency)}</span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">
          {count} {count === 1 ? "transaction" : "transactions"} ·{" "}
          <Link href="/budgets" className="underline underline-offset-2">
            Set a budget
          </Link>
        </p>
      )}

      {hasIncome && (
        <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3 text-sm">
          <span className="text-muted">Income</span>
          <span
            className="font-mono tabular-nums"
            style={{ color: "var(--good)" }}
          >
            +{formatMoney(incomeCents, currency)}
          </span>
        </div>
      )}
    </div>
  );
}
