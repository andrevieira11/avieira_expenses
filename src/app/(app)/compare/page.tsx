import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import { getBookCategories } from "@/lib/queries/categories";
import { getCompareRows } from "@/lib/queries/transactions";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatMoney } from "@/lib/money";
import { categoryColor } from "@/lib/colors";
import { monthShort, shiftMonth, todayYmd } from "@/lib/dates";

export const metadata = { title: "Compare" };

const RANGES = { "12": 12, "24": 24, all: 0 } as const;
type Range = keyof typeof RANGES;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; r?: string }>;
}) {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");
  const sp = await searchParams;
  const currency = ctx.book.currency;

  const cats = await getBookCategories(ctx.book.id);
  const house = cats.find((c) => c.slug === "house");
  const selected =
    sp.c === "all" ? null : (cats.find((c) => c.id === sp.c) ?? house ?? null);
  const range: Range = sp.r && sp.r in RANGES ? (sp.r as Range) : "12";

  const thisMonth = todayYmd().slice(0, 7);
  const firstMonth = RANGES[range] ? shiftMonth(thisMonth, -(RANGES[range] - 1)) : "2000-01";
  const rows = await getCompareRows(ctx.book.id, selected?.id ?? null, `${firstMonth}-01`);

  // Months shown: from the first month with data (or the range start) to this month, newest first.
  const dataStart = rows.reduce((m, r) => (r.ym < m ? r.ym : m), thisMonth);
  const start = range === "all" ? dataStart : firstMonth;
  const months: string[] = [];
  for (let m = thisMonth; m >= start; m = shiftMonth(m, -1)) months.push(m);
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];

  // Items in display order: the category's subcategories, or the categories themselves.
  const order = selected
    ? selected.subcategories.map((s) => ({ id: s.id as string | null, name: s.name }))
    : cats.map((c) => ({ id: c.id as string | null, name: c.name }));
  const cell = new Map(rows.map((r) => [`${r.id ?? ""}|${r.ym}`, r.cents]));
  const items = [...order, { id: null, name: selected ? `Other ${selected.name}` : "Uncategorised" }]
    .map((it) => {
      const byMonth = months.map((m) => cell.get(`${it.id ?? ""}|${m}`) ?? 0);
      const byYear = years.map((y) =>
        months.reduce((s, m, i) => (m.startsWith(y) ? s + byMonth[i] : s), 0),
      );
      const total = byMonth.reduce((a, b) => a + b, 0);
      const active = byMonth.filter((v) => v !== 0).length;
      return { ...it, byMonth, byYear, total, avg: active ? Math.round(total / active) : 0 };
    })
    .filter((it) => it.total !== 0);

  const max = Math.max(1, ...items.flatMap((it) => it.byMonth));
  const color = categoryColor(selected?.color ?? "slate");
  const totalsByMonth = months.map((_, i) => items.reduce((s, it) => s + it.byMonth[i], 0));
  const href = (c: string, r: Range = range) => `/compare?c=${c}&r=${r}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Compare"
        subtitle="How much each thing costs, month by month and year by year."
      />

      <div className="flex flex-wrap gap-2">
        <Chip href={href("all")} active={!selected} label="All categories" />
        {cats.map((c) => (
          <Chip key={c.id} href={href(c.id)} active={selected?.id === c.id} label={c.name} dot={categoryColor(c.color).cssVar} />
        ))}
      </div>
      <div className="flex gap-2">
        {(Object.keys(RANGES) as Range[]).map((r) => (
          <Chip key={r} href={href(selected?.id ?? "all", r)} active={range === r}
            label={r === "all" ? "All time" : `${r} months`} />
        ))}
      </div>

      {items.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-hairline py-12 text-center text-sm text-muted">
          Nothing spent here in this period.
        </p>
      ) : (
        <>
          <section className="rounded-3xl border border-hairline bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold">Per year</h2>
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.id ?? "none"} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{it.name}</span>
                  <span className="flex shrink-0 gap-4 font-mono tabular-nums">
                    {years.map((y, i) => (
                      <span key={y} className="text-right">
                        <span className="mr-1 text-xs text-muted">{y}</span>
                        {formatMoney(it.byYear[i], currency)}
                      </span>
                    ))}
                    <span className="text-right text-muted">
                      <span className="mr-1 text-xs">avg</span>
                      {formatMoney(it.avg, currency)}/mo
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-hairline bg-surface p-2">
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-surface px-2 text-left text-xs font-medium text-muted">Month</th>
                    {items.map((it) => (
                      <th key={it.id ?? "none"} className="whitespace-nowrap px-2 text-right text-xs font-medium text-muted">{it.name}</th>
                    ))}
                    <th className="px-2 text-right text-xs font-medium text-muted">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m, i) => (
                    <tr key={m}>
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-surface px-2 text-xs text-muted">
                        {monthShort(Number(m.slice(0, 4)), Number(m.slice(5, 7)))} {m.slice(2, 4)}
                      </td>
                      {items.map((it) => {
                        const v = it.byMonth[i];
                        const prev = it.byMonth[i + 1];
                        const pct = v > 0 ? Math.round(12 + (v / max) * 48) : 0;
                        return (
                          <td key={it.id ?? "none"} title={prev ? `${v >= prev ? "+" : "−"}${formatMoney(Math.abs(v - prev), currency)} vs the month before` : undefined}
                            className="whitespace-nowrap rounded-lg px-2 py-1.5 text-right font-mono tabular-nums"
                            style={pct ? { background: `color-mix(in oklab, ${color.cssVar} ${pct}%, transparent)` } : undefined}>
                            {v ? formatMoney(v, currency) : <span className="text-muted">·</span>}
                            {v > 0 && prev > 0 && Math.abs(v - prev) >= 100 && (
                              <span className={`ml-1 text-[10px] ${v > prev ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {v > prev ? "▲" : "▼"}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap px-2 text-right font-mono font-medium tabular-nums">
                        {totalsByMonth[i] ? formatMoney(totalsByMonth[i], currency) : <span className="text-muted">·</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="text-xs text-muted">▲▼ = changed by €1 or more vs the month before. Tap a category above to see its parts.</p>
        </>
      )}
    </div>
  );
}

function Chip({ href, active, label, dot }: { href: string; active: boolean; label: string; dot?: string }) {
  return (
    <Link href={href}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${active ? "border-brand text-brand" : "border-hairline text-muted"}`}>
      {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
      {label}
    </Link>
  );
}
