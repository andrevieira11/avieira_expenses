"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { acceptInvite } from "@/lib/actions/books-manage";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    const res = await acceptInvite(token);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(res.error);
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-3xl border border-hairline bg-surface p-6 text-center">
      <h1 className="text-lg font-semibold">Convite para um livro partilhado</h1>
      <p className="mt-1 text-sm text-muted">
        Junta-te a este livro do Saldo para partilharem despesas.
      </p>
      {error && <p className="mt-3 text-sm text-over">{error}</p>}
      <button
        onClick={accept}
        disabled={busy}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Aceitar convite
      </button>
      <Link
        href="/"
        className="mt-3 inline-block text-sm text-muted hover:text-fg"
      >
        Agora não
      </Link>
    </div>
  );
}
