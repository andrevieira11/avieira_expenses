"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export function SearchBar({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim();
    router.push(t ? `/transactions?q=${encodeURIComponent(t)}` : "/transactions");
  }

  function clear() {
    setQ("");
    router.push("/transactions");
  }

  return (
    <form onSubmit={submit} className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Procurar por comerciante, nota, categoria…"
        className="w-full rounded-2xl border border-hairline bg-surface py-2.5 pl-10 pr-10 text-sm outline-none placeholder:text-muted focus:border-muted"
      />
      {q && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2"
          aria-label="Limpar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
