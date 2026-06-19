/**
 * Category color system. `color` on a category is one of these tokens; everything
 * (dots, chips, charts) resolves through here so a hue means the same thing app-wide.
 * `cssVar` strings are used directly as SVG/Recharts fills.
 */
export type CategoryColor =
  | "amber"
  | "green"
  | "orange"
  | "blue"
  | "slate"
  | "rose"
  | "purple"
  | "teal"
  | "cyan"
  | "pink"
  | "brown";

export type ColorTokens = {
  cssVar: string;
  softVar: string;
  text: string;
  bg: string;
  bgSoft: string;
  border: string;
};

export const CATEGORY_COLORS: Record<CategoryColor, ColorTokens> = {
  amber: {
    cssVar: "var(--cat-amber)",
    softVar: "var(--cat-amber-soft)",
    text: "text-cat-amber",
    bg: "bg-cat-amber",
    bgSoft: "bg-cat-amber-soft",
    border: "border-cat-amber",
  },
  green: {
    cssVar: "var(--cat-green)",
    softVar: "var(--cat-green-soft)",
    text: "text-cat-green",
    bg: "bg-cat-green",
    bgSoft: "bg-cat-green-soft",
    border: "border-cat-green",
  },
  orange: {
    cssVar: "var(--cat-orange)",
    softVar: "var(--cat-orange-soft)",
    text: "text-cat-orange",
    bg: "bg-cat-orange",
    bgSoft: "bg-cat-orange-soft",
    border: "border-cat-orange",
  },
  blue: {
    cssVar: "var(--cat-blue)",
    softVar: "var(--cat-blue-soft)",
    text: "text-cat-blue",
    bg: "bg-cat-blue",
    bgSoft: "bg-cat-blue-soft",
    border: "border-cat-blue",
  },
  slate: {
    cssVar: "var(--cat-slate)",
    softVar: "var(--cat-slate-soft)",
    text: "text-cat-slate",
    bg: "bg-cat-slate",
    bgSoft: "bg-cat-slate-soft",
    border: "border-cat-slate",
  },
  rose: { cssVar: "var(--cat-rose)", softVar: "var(--cat-rose-soft)", text: "text-cat-rose", bg: "bg-cat-rose", bgSoft: "bg-cat-rose-soft", border: "border-cat-rose" },
  purple: { cssVar: "var(--cat-purple)", softVar: "var(--cat-purple-soft)", text: "text-cat-purple", bg: "bg-cat-purple", bgSoft: "bg-cat-purple-soft", border: "border-cat-purple" },
  teal: { cssVar: "var(--cat-teal)", softVar: "var(--cat-teal-soft)", text: "text-cat-teal", bg: "bg-cat-teal", bgSoft: "bg-cat-teal-soft", border: "border-cat-teal" },
  cyan: { cssVar: "var(--cat-cyan)", softVar: "var(--cat-cyan-soft)", text: "text-cat-cyan", bg: "bg-cat-cyan", bgSoft: "bg-cat-cyan-soft", border: "border-cat-cyan" },
  pink: { cssVar: "var(--cat-pink)", softVar: "var(--cat-pink-soft)", text: "text-cat-pink", bg: "bg-cat-pink", bgSoft: "bg-cat-pink-soft", border: "border-cat-pink" },
  brown: { cssVar: "var(--cat-brown)", softVar: "var(--cat-brown-soft)", text: "text-cat-brown", bg: "bg-cat-brown", bgSoft: "bg-cat-brown-soft", border: "border-cat-brown" },
};

/** Resolve a stored color token to its design tokens, falling back to slate. */
export function categoryColor(token: string | null | undefined): ColorTokens {
  return CATEGORY_COLORS[token as CategoryColor] ?? CATEGORY_COLORS.slate;
}

export const BUDGET_HEALTH = {
  good: "var(--good)",
  warn: "var(--warn)",
  over: "var(--over)",
} as const;

/** Lerp budget health color by spent/budget ratio (0 = under, >=1 = over). */
export function budgetHealthVar(ratio: number): string {
  if (ratio >= 1) return BUDGET_HEALTH.over;
  if (ratio >= 0.85) return BUDGET_HEALTH.warn;
  return BUDGET_HEALTH.good;
}
