"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { categoryColor } from "@/lib/colors";
import { formatMoney } from "@/lib/money";
import type { CategoryTotal } from "@/lib/queries/transactions";

export function CategoryDonut({
  items,
  currency,
}: {
  items: CategoryTotal[];
  currency: string;
}) {
  const data = items
    .filter((i) => i.netCents > 0)
    .map((i) => ({
      name: i.name,
      value: i.netCents,
      color: categoryColor(i.color).cssVar,
    }));

  if (data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={72}
              paddingAngle={2}
              stroke="none"
              animationDuration={700}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[0.65rem] text-muted">Total</p>
            <p className="font-mono text-sm font-semibold tabular-nums">
              {formatMoney(total, currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="min-w-0 flex-1 truncate">{d.name}</span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
