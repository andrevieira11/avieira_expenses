"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from "./nav";
import { cn } from "@/lib/utils";

export function Sidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-hairline bg-surface md:flex md:flex-col md:gap-1 md:px-3 md:py-5">
      <Link href="/" className="mb-4 flex items-center gap-2 px-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
          S
        </span>
        <span className="text-lg font-semibold tracking-tight">Saldo</span>
      </Link>

      <Link
        href="/add"
        className="mb-3 flex items-center gap-2 rounded-2xl bg-brand px-3 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        Adicionar
      </Link>

      <nav className="flex flex-col gap-0.5">
        {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          const showBadge = item.href === "/inbox" && pendingCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-surface-2 text-fg"
                  : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <Icon className={cn("h-[1.15rem] w-[1.15rem]", active && "text-brand")} />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-over px-1.5 text-[0.65rem] font-semibold text-white">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
