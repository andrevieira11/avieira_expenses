import Link from "next/link";
import { monthShort } from "@/lib/dates";

const CHART_H = 140;

export function YearBars({
  year,
  data,
}: {
  year: number;
  data: { month: number; netCents: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.netCents));

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">By month</h2>
      <div className="flex items-end gap-1.5">
        {data.map((d) => {
          const h = Math.round((Math.max(0, d.netCents) / max) * CHART_H);
          const ym = `${year}-${String(d.month).padStart(2, "0")}`;
          return (
            <Link
              key={d.month}
              href={`/month?m=${ym}`}
              className="group flex flex-1 flex-col items-center gap-1"
              title={monthShort(year, d.month)}
            >
              <div className="flex w-full items-end" style={{ height: CHART_H }}>
                <div
                  className="w-full rounded-md bg-brand/75 transition group-hover:bg-brand"
                  style={{ height: h, minHeight: d.netCents > 0 ? 3 : 0 }}
                />
              </div>
              <span className="text-[0.6rem] capitalize text-muted">
                {monthShort(year, d.month)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
