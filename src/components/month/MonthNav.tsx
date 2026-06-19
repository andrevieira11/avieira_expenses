import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, shiftMonth } from "@/lib/dates";

export function MonthNav({ year, month }: { year: number; month: number }) {
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  const prev = shiftMonth(ym, -1);
  const next = shiftMonth(ym, 1);

  return (
    <div className="flex items-center justify-between">
      <Link
        href={`/month?m=${prev}`}
        className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-lg font-semibold capitalize">
        {monthLabel(year, month)}
      </h1>
      <Link
        href={`/month?m=${next}`}
        className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
