"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown, Wallet, Settings2 } from "lucide-react";
import { useBooks } from "@/lib/book-context";
import { setActiveBook } from "@/lib/actions/book";
import { cn } from "@/lib/utils";

export function BookSwitcher() {
  const { books, activeBook } = useBooks();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function choose(id: string) {
    setOpen(false);
    if (id === activeBook.id) return;
    startTransition(async () => {
      await setActiveBook(id);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-2",
          pending && "opacity-60",
        )}
      >
        <Wallet className="h-4 w-4 text-muted" />
        <span className="max-w-[10rem] truncate">{activeBook.name}</span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-hairline bg-surface p-1 shadow-lg">
            {books.map((b) => (
              <button
                key={b.id}
                onClick={() => choose(b.id)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-surface-2"
              >
                <span className="truncate">{b.name}</span>
                {b.id === activeBook.id && <Check className="h-4 w-4 text-brand" />}
              </button>
            ))}
            <div className="my-1 h-px bg-hairline" />
            <Link
              href="/settings/books"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-surface-2"
            >
              <Settings2 className="h-4 w-4 text-muted" />
              Manage books
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
