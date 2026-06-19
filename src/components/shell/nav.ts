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
  { href: "/", label: "Início", icon: House },
  { href: "/month", label: "Mês", icon: CalendarRange },
  { href: "/year", label: "Ano", icon: ChartColumnBig },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];

/** Extra destinations shown in the desktop sidebar. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/transactions", label: "Movimentos", icon: ReceiptText },
  { href: "/budgets", label: "Orçamentos", icon: Target },
  { href: "/subscriptions", label: "Subscrições", icon: Repeat },
  { href: "/goals", label: "Objetivos", icon: PiggyBank },
  { href: "/splits", label: "Acertos", icon: HandCoins },
  { href: "/settings", label: "Definições", icon: Settings },
];

/** Active when the path equals the item or is nested under it (but "/" only exact). */
export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
