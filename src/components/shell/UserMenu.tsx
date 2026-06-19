"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { SECONDARY_NAV } from "./nav";

export function UserMenu({ user }: { user: { name: string; email: string } }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const initials = user.name?.slice(0, 1).toUpperCase() || "?";

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-semibold text-white"
        aria-label="Account"
      >
        {initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-hairline bg-surface p-1 shadow-lg">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-hairline" />

            {/* Secondary destinations — the mobile entry point (no sidebar on phones). */}
            {SECONDARY_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-surface-2"
                >
                  <Icon className="h-4 w-4 text-muted" />
                  {item.label}
                </Link>
              );
            })}

            <div className="my-1 h-px bg-hairline" />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-fg hover:bg-surface-2"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
