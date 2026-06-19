"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { PRIMARY_NAV, isActive } from "./nav";
import { cn } from "@/lib/utils";

export function TabBar({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();
  const [a, b, c, d] = PRIMARY_NAV;

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-hairline bg-bg/90 px-2 backdrop-blur-md md:hidden">
      <TabLink item={a} active={isActive(pathname, a.href)} />
      <TabLink item={b} active={isActive(pathname, b.href)} />

      <Link
        href="/add"
        aria-label="Adicionar despesa"
        className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 ring-4 ring-bg transition active:scale-95"
      >
        <Plus className="h-7 w-7" />
      </Link>

      <TabLink item={c} active={isActive(pathname, c.href)} />
      <TabLink item={d} active={isActive(pathname, d.href)} badge={pendingCount} />
    </nav>
  );
}

function TabLink({
  item,
  active,
  badge = 0,
}: {
  item: (typeof PRIMARY_NAV)[number];
  active: boolean;
  badge?: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-medium transition",
        active ? "text-fg" : "text-muted",
      )}
    >
      <span className="relative">
        <Icon className={cn("h-[1.35rem] w-[1.35rem]", active && "text-brand")} />
        {badge > 0 && (
          <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-over px-1 text-[0.6rem] font-semibold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      {item.label}
    </Link>
  );
}
