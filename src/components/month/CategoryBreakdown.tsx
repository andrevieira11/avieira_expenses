import { ChevronRight } from "lucide-react";
import { categoryColor } from "@/lib/colors";
import { formatMoney } from "@/lib/money";
import type {
  CategoryTotal,
  SubcategoryTotal,
} from "@/lib/queries/transactions";

export function CategoryBreakdown({
  items,
  subcategories = [],
  currency,
}: {
  items: CategoryTotal[];
  subcategories?: SubcategoryTotal[];
  currency: string;
}) {
  const positive = items.filter((i) => i.netCents > 0);
  if (positive.length === 0) return null;

  const total = positive.reduce((s, i) => s + i.netCents, 0) || 1;
  const subsByCat = new Map<string, SubcategoryTotal[]>();
  for (const s of subcategories) {
    if (s.netCents <= 0 || !s.categoryId) continue;
    const arr = subsByCat.get(s.categoryId) ?? [];
    arr.push(s);
    subsByCat.set(s.categoryId, arr);
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">
        Onde foi o dinheiro
      </h2>
      <div className="space-y-3">
        {positive.map((i) => {
          const color = categoryColor(i.color);
          const pct = Math.round((i.netCents / total) * 100);
          const subs = subsByCat.get(i.categoryId) ?? [];

          return (
            <details key={i.categoryId} className="group">
              <summary className="list-none">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    {subs.length > 0 && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted transition-transform group-open:rotate-90" />
                    )}
                    {i.name}
                  </span>
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
              </summary>

              {subs.length > 0 && (
                <div className="mt-2 space-y-1.5 pl-5">
                  {subs.map((s) => {
                    const sp = Math.round((s.netCents / i.netCents) * 100);
                    return (
                      <div key={s.subcategoryId}>
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span>{s.name}</span>
                          <span className="font-mono tabular-nums">
                            {formatMoney(s.netCents, currency)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full opacity-70"
                            style={{
                              width: `${sp}%`,
                              backgroundColor: color.cssVar,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
