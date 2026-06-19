import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function YearNav({ year }: { year: number }) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href={`/year?y=${year - 1}`}
        className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
        aria-label="Previous year"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-lg font-semibold tabular-nums">{year}</h1>
      <Link
        href={`/year?y=${year + 1}`}
        className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
        aria-label="Next year"
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
