import { formatMoney } from "@/lib/money";
import { budgetHealthVar, categoryColor } from "@/lib/colors";

type Row = {
  name: string;
  color?: string;
  budgetCents: number;
  spentCents: number;
};

export function PlafondView({
  overall,
  categories,
  currency,
}: {
  overall: Row | null;
  categories: Row[];
  currency: string;
}) {
  if (!overall && categories.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">This month&apos;s allowance</h2>
      <div className="space-y-4 rounded-3xl border border-hairline bg-surface p-5">
        {overall && <PlafondBar row={overall} currency={currency} bold />}
        {categories.map((r, i) => (
          <PlafondBar key={i} row={r} currency={currency} />
        ))}
      </div>
    </section>
  );
}

function PlafondBar({
  row,
  currency,
  bold,
}: {
  row: Row;
  currency: string;
  bold?: boolean;
}) {
  const ratio = row.budgetCents > 0 ? row.spentCents / row.budgetCents : 0;
  const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  const remaining = row.budgetCents - row.spentCents;
  const dot = row.color ? categoryColor(row.color).cssVar : null;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className={`flex items-center gap-2 ${bold ? "font-medium" : ""}`}>
          {dot && (
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: dot }}
            />
          )}
          {row.name}
        </span>
        <span
          className="font-mono tabular-nums"
          style={{ color: remaining >= 0 ? "var(--muted)" : "var(--over)" }}
        >
          {remaining >= 0
            ? `Left ${formatMoney(remaining, currency)}`
            : `Over ${formatMoney(-remaining, currency)}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: budgetHealthVar(ratio) }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-xs text-muted">
        <span>{formatMoney(row.spentCents, currency)}</span>
        <span>{formatMoney(row.budgetCents, currency)}</span>
      </div>
    </div>
  );
}
