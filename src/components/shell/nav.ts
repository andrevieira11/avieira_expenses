import {
  House,
  CalendarRange,
  ChartColumnBig,
  Inbox,
  ReceiptText,
  Target,
  PiggyBank,
  Repeat,
  HandCoins,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Bottom tab bar (mobile) — 4 destinations around the center Add button. */
export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/month", label: "Month", icon: CalendarRange },
  { href: "/year", label: "Year", icon: ChartColumnBig },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];

/** Extra destinations shown in the desktop sidebar. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/goals", label: "Goals", icon: PiggyBank },
  { href: "/splits", label: "Splits", icon: HandCoins },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Active when the path equals the item or is nested under it (but "/" only exact). */
export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
