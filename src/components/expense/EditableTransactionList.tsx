"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { TransactionRow } from "./TransactionRow";
import { EditExpenseSheet } from "./EditExpenseSheet";
import { formatMoney } from "@/lib/money";
import { dayLabel } from "@/lib/dates";
import type { MonthTransaction } from "@/lib/queries/transactions";
import type { CategoryWithSubs } from "@/lib/queries/categories";

export function EditableTransactionList({
  transactions,
  categories,
  currency,
  emptyHint = "Add your first expense.",
}: {
  transactions: MonthTransaction[];
  categories: CategoryWithSubs[];
  currency: string;
  emptyHint?: string;
}) {
  const [editing, setEditing] = useState<MonthTransaction | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-hairline py-14 text-center">
        <Receipt className="h-7 w-7 text-muted" />
        <p className="mt-3 text-sm font-medium">No transactions yet</p>
        <p className="mt-1 text-xs text-muted">{emptyHint}</p>
      </div>
    );
  }

  const groups: { date: string; items: MonthTransaction[] }[] = [];
  for (const tx of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.date === tx.txDate) last.items.push(tx);
    else groups.push({ date: tx.txDate, items: [tx] });
  }

  return (
    <>
      <section className="space-y-5">
        {groups.map(({ date, items }) => {
          const dayTotal = items.reduce((s, t) => s + (t.amountCents ?? 0), 0);
          return (
            <div key={date}>
              <div className="mb-1.5 flex items-center justify-between px-1 text-xs text-muted">
                <span className="capitalize">{dayLabel(date)}</span>
                <span className="font-mono tabular-nums">
                  {formatMoney(dayTotal, currency)}
                </span>
              </div>
              <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface px-3">
                {items.map((t) => (
                  <TransactionRow
                    key={t.id}
                    tx={t}
                    onClick={() => setEditing(t)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>

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
