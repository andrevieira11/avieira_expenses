"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox, CircleCheck, Trash2, Loader2 } from "lucide-react";
import { EditExpenseSheet } from "@/components/expense/EditExpenseSheet";
import { clearInbox } from "@/lib/actions/inbox";
import { formatFlow } from "@/lib/money";
import { categoryColor } from "@/lib/colors";
import type { MonthTransaction } from "@/lib/queries/transactions";
import type { CategoryWithSubs } from "@/lib/queries/categories";

export function PendingInbox({
  pending,
  categories,
  currency,
}: {
  pending: MonthTransaction[];
  categories: CategoryWithSubs[];
  currency: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<MonthTransaction | null>(null);
  const [clearing, startClear] = useTransition();

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-hairline py-16 text-center">
        <CircleCheck className="h-8 w-8 text-good" />
        <p className="mt-3 text-sm font-medium">Inbox empty</p>
        <p className="mt-1 text-xs text-muted">
          No moey! captures to categorize.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          disabled={clearing}
          onClick={() => {
            if (
              !confirm(
                "Remove all pending transactions? They won't be re-imported — you'll only get new spends from now on.",
              )
            )
              return;
            startClear(async () => {
              await clearInbox();
              router.refresh();
            });
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-hairline px-3 py-1.5 text-xs font-medium text-muted transition hover:text-over disabled:opacity-50"
        >
          {clearing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Clear all
        </button>
      </div>
      <div className="space-y-2">
        {pending.map((tx) => {
          const color = tx.categoryColor ? categoryColor(tx.categoryColor) : null;
          return (
            <button
              key={tx.id}
              onClick={() => setEditing(tx)}
              className="flex w-full items-center gap-3 rounded-2xl border border-hairline bg-surface p-3.5 text-left transition hover:bg-surface-2"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                style={{ backgroundColor: color ? color.softVar : "var(--surface-2)" }}
              >
                <Inbox className="h-5 w-5 text-muted" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {tx.merchant || "moey! transaction"}
                </p>
                <p className="truncate text-xs text-muted">
                  {tx.categoryName
                    ? `Suggestion: ${tx.categoryName}`
                    : "Tap to categorize"}
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm tabular-nums">
                {tx.amountCents == null ? "— €" : formatFlow(tx.amountCents, currency)}
              </span>
            </button>
          );
        })}
      </div>

      {editing && (
        <EditExpenseSheet
          tx={editing}
          categories={categories}
          currency={currency}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
