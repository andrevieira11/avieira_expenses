"use client";

import { useState } from "react";
import { Inbox, CircleCheck } from "lucide-react";
import { EditExpenseSheet } from "@/components/expense/EditExpenseSheet";
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
  const [editing, setEditing] = useState<MonthTransaction | null>(null);

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-hairline py-16 text-center">
        <CircleCheck className="h-8 w-8 text-good" />
        <p className="mt-3 text-sm font-medium">Inbox vazia</p>
        <p className="mt-1 text-xs text-muted">
          Sem capturas do moey! por categorizar.
        </p>
      </div>
    );
  }

  return (
    <>
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
                  {tx.merchant || "Movimento moey!"}
                </p>
                <p className="truncate text-xs text-muted">
                  {tx.categoryName
                    ? `Sugestão: ${tx.categoryName}`
                    : "Toca para categorizar"}
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
