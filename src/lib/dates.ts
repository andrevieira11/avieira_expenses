import { format } from "date-fns";
import { pt } from "date-fns/locale";

/**
 * Calendar-date helpers for Postgres DATE columns. Month boundaries are computed with
 * integer arithmetic (no Date / timezone) so nothing shifts across midnight.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-01" for the given 1-based month. */
export function firstOfMonth(year: number, month: number): string {
  return `${year}-${pad(month)}-01`;
}

/** Exclusive upper bound: the first day of the following month. */
export function firstOfNextMonth(year: number, month: number): string {
  return month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
}

/** Half-open range [start, endExclusive) covering a month. */
export function monthRange(year: number, month: number) {
  return { start: firstOfMonth(year, month), endExclusive: firstOfNextMonth(year, month) };
}

/** Half-open range [start, endExclusive) covering a year. */
export function yearRange(year: number) {
  return { start: `${year}-01-01`, endExclusive: `${year + 1}-01-01` };
}

/** Today's local calendar date as "YYYY-MM-DD" (default for new transactions). */
export function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse a "YYYY-MM-DD" / "YYYY-MM" string into { year, month }. */
export function parseYearMonth(s: string): { year: number; month: number } {
  const [y, m] = s.split("-");
  return { year: Number(y), month: Number(m) };
}

/** Localized month label, e.g. (2025, 11) -> "Novembro 2025". */
export function monthLabel(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), "LLLL yyyy", { locale: pt });
}

/** Short localized month, e.g. "Nov". */
export function monthShort(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), "LLL", { locale: pt });
}

/** Shift a "YYYY-MM" string by N months. */
export function shiftMonth(ym: string, delta: number): string {
  const { year, month } = parseYearMonth(ym);
  const idx = (year * 12 + (month - 1)) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

/** Friendly label for a "YYYY-MM-DD" day: "Hoje", "Ontem", else "19 de junho". */
export function dayLabel(ymd: string): string {
  if (ymd === todayYmd()) return "Hoje";
  const { year, month } = parseYearMonth(ymd);
  const day = Number(ymd.slice(8, 10));
  return format(new Date(year, month - 1, day), "d 'de' LLLL", { locale: pt });
}

export type Cadence = "weekly" | "monthly" | "quarterly" | "yearly";

/** Advance a "YYYY-MM-DD" by `count` cadence units. */
export function advanceDate(ymd: string, cadence: Cadence, count: number): string {
  const { year, month } = parseYearMonth(ymd);
  const day = Number(ymd.slice(8, 10));
  const d = new Date(year, month - 1, day);
  if (cadence === "weekly") d.setDate(d.getDate() + 7 * count);
  else if (cadence === "monthly") d.setMonth(d.getMonth() + count);
  else if (cadence === "quarterly") d.setMonth(d.getMonth() + 3 * count);
  else d.setFullYear(d.getFullYear() + count);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days from today to a "YYYY-MM-DD" (negative = past). */
export function daysUntil(ymd: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { year, month } = parseYearMonth(ymd);
  const target = new Date(year, month - 1, Number(ymd.slice(8, 10)));
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

const CADENCE_LABELS: Record<Cadence, string> = {
  weekly: "semanal",
  monthly: "mensal",
  quarterly: "trimestral",
  yearly: "anual",
};
export function cadenceLabel(c: Cadence): string {
  return CADENCE_LABELS[c];
}
