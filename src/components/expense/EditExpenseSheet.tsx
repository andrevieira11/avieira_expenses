"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2, Trash2, X } from "lucide-react";
import { AmountKeypad } from "./AmountKeypad";
import {
  CategoryPicker,
  type CategorySelection,
} from "./CategoryPicker";
import { ReceiptField } from "./ReceiptField";
import {
  updateTransaction,
  deleteTransaction,
} from "@/lib/actions/transactions";
import { todayYmd } from "@/lib/dates";
import type { CategoryWithSubs } from "@/lib/queries/categories";
import type { MonthTransaction } from "@/lib/queries/transactions";
import { cn } from "@/lib/utils";

export function EditExpenseSheet({
  tx,
  categories,
  currency,
  onClose,
}: {
  tx: MonthTransaction;
  categories: CategoryWithSubs[];
  currency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [cents, setCents] = useState(Math.abs(tx.amountCents ?? 0));
  const [sel, setSel] = useState<CategorySelection>({
    categoryId: tx.categoryId,
    subcategoryId: tx.subcategoryId,
  });
  const [type, setType] = useState<"expense" | "income" | "refund">(tx.type);
  const [txDate, setTxDate] = useState(tx.txDate);
  const [note, setNote] = useState(tx.note ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canSave = cents > 0 && !!sel.categoryId && !pending;

  async function save() {
    if (!canSave) return;
    setPending(true);
    setError(null);
    const res = await updateTransaction(tx.id, {
      amountCents: cents,
      type,
      txDate,
      categoryId: sel.categoryId,
      subcategoryId: sel.subcategoryId,
      note: note.trim() || null,
      // Preserve the merchant (moey! captures have one) so merchant-memory can learn.
      merchant: tx.merchant,
    });
    if (!res.ok) {
      setError(res.error);
      setPending(false);
      return;
    }
    onClose();
    router.refresh();
  }

  async function remove() {
    setPending(true);
    const res = await deleteTransaction(tx.id);
    if (!res.ok) {
      setError(res.error);
      setPending(false);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="pb-safe relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-hairline bg-bg p-5 md:rounded-3xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Edit transaction</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex justify-center">
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
                  ? "Expense"
                  : t === "income"
                    ? "Income"
                    : "Refund"}
              </button>
            ))}
          </div>
        </div>

        <AmountKeypad cents={cents} onChange={setCents} currency={currency} />

        <div className="mt-5">
          <h3 className="mb-3 text-sm font-medium text-muted">Category</h3>
          <CategoryPicker categories={categories} value={sel} onChange={setSel} />
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-muted">Date</label>
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
            placeholder="Note (optional)"
            maxLength={500}
            className="w-full rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
          />
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-medium text-muted">Receipt</h3>
          <ReceiptField txId={tx.id} />
        </div>

        {error && <p className="mt-3 text-sm text-over">{error}</p>}

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
            disabled={pending}
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3.5 py-3 text-sm font-medium transition",
              confirmDelete
                ? "border-over bg-over text-white"
                : "border-hairline text-over hover:bg-surface-2",
            )}
          >
            <Trash2 className="h-4 w-4" />
            {confirmDelete ? "Confirm" : ""}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}
