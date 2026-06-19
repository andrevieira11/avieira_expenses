"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { categoryColor } from "@/lib/colors";

export function MonthlyComparisonChart({
  data,
  categories,
}: {
  data: Record<string, number | string>[];
  categories: { name: string; color: string }[];
}) {
  if (categories.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">Comparar meses</h2>
      <div className="rounded-3xl border border-hairline bg-surface p-4">
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--hairline)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--fg)" }}
                formatter={(value, name) => [
                  `${Number(value).toLocaleString("pt-PT", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €`,
                  name,
                ]}
              />
              {categories.map((c) => (
                <Bar
                  key={c.name}
                  dataKey={c.name}
                  stackId="a"
                  fill={categoryColor(c.color).cssVar}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {categories.map((c) => (
            <span
              key={c.name}
              className="flex items-center gap-1.5 text-xs text-muted"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: categoryColor(c.color).cssVar }}
              />
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
