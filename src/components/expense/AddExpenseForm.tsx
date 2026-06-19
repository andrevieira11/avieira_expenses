"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AmountKeypad } from "./AmountKeypad";
import { CategoryPicker, type CategorySelection } from "./CategoryPicker";
import { createTransaction } from "@/lib/actions/transactions";
import { todayYmd } from "@/lib/dates";
import type { CategoryWithSubs } from "@/lib/queries/categories";
import { cn } from "@/lib/utils";

export function AddExpenseForm({
  categories,
  currency,
}: {
  categories: CategoryWithSubs[];
  currency: string;
}) {
  const router = useRouter();
  const [cents, setCents] = useState(0);
  const [sel, setSel] = useState<CategorySelection>({
    categoryId: null,
    subcategoryId: null,
  });
  const [type, setType] = useState<"expense" | "income" | "refund">("expense");
  const [txDate, setTxDate] = useState(todayYmd());
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = cents > 0 && !!sel.categoryId && !pending;

  async function save() {
    if (!canSave) return;
    setPending(true);
    setError(null);
    const res = await createTransaction({
      amountCents: cents,
      type,
      txDate,
      categoryId: sel.categoryId,
      subcategoryId: sel.subcategoryId,
      note: note.trim() || null,
      merchant: null,
    });
    if (!res.ok) {
      setError(res.error);
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pb-28">
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-hairline bg-surface p-1 text-sm">
          {(["expense", "income", "refund"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium transition",
                type === t ? "bg-fg text-bg" : "text-muted",
              )}
            >
              {t === "expense"
                ? "Despesa"
                : t === "income"
                  ? "Receita"
                  : "Reembolso"}
            </button>
          ))}
        </div>
      </div>

      <AmountKeypad cents={cents} onChange={setCents} currency={currency} />

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Categoria</h2>
        <CategoryPicker categories={categories} value={sel} onChange={setSel} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-muted">Data</label>
          <input
            type="date"
            value={txDate}
            max={todayYmd()}
            onChange={(e) => setTxDate(e.target.value)}
            className="rounded-xl border border-hairline bg-surface px-3 py-1.5 text-sm"
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          maxLength={500}
          className="w-full rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
        />
      </section>

      {error && <p className="text-sm text-over">{error}</p>}

      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-bg/90 px-4 py-3 backdrop-blur-md md:static md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </button>
      </div>
    </div>
  );
}
