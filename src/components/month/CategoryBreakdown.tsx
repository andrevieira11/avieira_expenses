import { categoryColor } from "@/lib/colors";
import { formatMoney } from "@/lib/money";
import type { CategoryTotal } from "@/lib/queries/transactions";

export function CategoryBreakdown({
  items,
  currency,
}: {
  items: CategoryTotal[];
  currency: string;
}) {
  const positive = items.filter((i) => i.netCents > 0);
  if (positive.length === 0) return null;

  const total = positive.reduce((s, i) => s + i.netCents, 0) || 1;

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">
        Onde foi o dinheiro
      </h2>
      <div className="space-y-3">
        {positive.map((i) => {
          const color = categoryColor(i.color);
          const pct = Math.round((i.netCents / total) * 100);
          return (
            <div key={i.categoryId}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{i.name}</span>
                <span className="font-mono tabular-nums text-muted">
                  {formatMoney(i.netCents, currency)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: color.cssVar }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
