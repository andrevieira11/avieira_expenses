"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Repeat } from "lucide-react";
import {
  createRecurring,
  deleteRecurring,
  payRecurring,
} from "@/lib/actions/recurring";
import { formatMoney, euroInputToCents } from "@/lib/money";
import { cadenceLabel, daysUntil, todayYmd, type Cadence } from "@/lib/dates";
import { categoryColor } from "@/lib/colors";
import type { Recurring } from "@/lib/queries/recurring";

type Cat = { id: string; name: string; color: string };

const CAD_MONTHS: Record<Cadence, number> = {
  weekly: 0.2301,
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};
const monthlyEquivalent = (r: Recurring) =>
  r.amountCents / (CAD_MONTHS[r.cadence as Cadence] * r.intervalCount);

export function SubscriptionsManager({
  recurring,
  categories,
  currency,
}: {
  recurring: Recurring[];
  categories: Cat[];
  currency: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [nextDue, setNextDue] = useState(todayYmd());
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    const cents = euroInputToCents(amount);
    if (!name.trim() || cents == null || cents <= 0) return;
    setBusy(true);
    await createRecurring({
      name: name.trim(),
      amountCents: cents,
      cadence,
      intervalCount: 1,
      nextDue,
      categoryId: categoryId || null,
      subcategoryId: null,
    });
    setName("");
    setAmount("");
    setBusy(false);
    router.refresh();
  }

  const monthlyTotal = Math.round(
    recurring.filter((r) => r.isActive).reduce((s, r) => s + monthlyEquivalent(r), 0),
  );

  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded-3xl border border-hairline bg-surface p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. Netflix)"
            maxLength={80}
            className="flex-1 rounded-xl border border-hairline bg-bg px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
          />
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="€"
            className="w-full rounded-xl border border-hairline bg-bg px-3.5 py-2.5 text-right font-mono text-sm tabular-nums outline-none placeholder:text-muted focus:border-muted sm:w-24"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as Cadence)}
            className="rounded-xl border border-hairline bg-bg px-3 py-2.5 text-sm outline-none focus:border-muted"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input
            type="date"
            value={nextDue}
            onChange={(e) => setNextDue(e.target.value)}
            className="rounded-xl border border-hairline bg-bg px-3 py-2.5 text-sm outline-none focus:border-muted"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="flex-1 rounded-xl border border-hairline bg-bg px-3 py-2.5 text-sm outline-none focus:border-muted"
          >
            <option value="">Category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={add}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        </div>
      </div>

      {recurring.length > 0 && (
        <p className="px-1 text-sm text-muted">
          Estimated monthly cost:{" "}
          <span className="font-mono font-semibold text-fg tabular-nums">
            {formatMoney(monthlyTotal, currency)}
          </span>
        </p>
      )}

      {recurring.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-hairline py-14 text-center">
          <Repeat className="h-7 w-7 text-muted" />
          <p className="mt-3 text-sm font-medium">No subscriptions</p>
          <p className="mt-1 text-xs text-muted">
            Add your recurring expenses.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recurring.map((r) => (
            <RecurringRow key={r.id} r={r} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecurringRow({ r, currency }: { r: Recurring; currency: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const d = daysUntil(r.nextDue);
  const color = r.categoryColor ? categoryColor(r.categoryColor) : null;
  const dueText =
    d < 0 ? `Overdue ${-d}d` : d === 0 ? "Due today" : `Renews in ${d}d`;
  const dueColor =
    d <= 1 ? "var(--over)" : d <= 7 ? "var(--warn)" : "var(--muted)";

  async function pay() {
    setBusy(true);
    await payRecurring(r.id);
    setBusy(false);
    router.refresh();
  }
  async function remove() {
    setBusy(true);
    await deleteRecurring(r.id);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-3.5">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: color ? color.softVar : "var(--surface-2)" }}
      >
        <Repeat className="h-4 w-4 text-muted" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{r.name}</p>
        <p className="truncate text-xs text-muted">
          {formatMoney(r.amountCents, currency)} · {cadenceLabel(r.cadence as Cadence)} ·{" "}
          <span style={{ color: dueColor }}>{dueText}</span>
        </p>
      </div>
      <button
        onClick={pay}
        disabled={busy}
        className="rounded-xl bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        Pay
      </button>
      <button
        onClick={remove}
        disabled={busy}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-over"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
