"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, PiggyBank } from "lucide-react";
import {
  createGoal,
  contributeGoal,
  deleteGoal,
} from "@/lib/actions/goals";
import { formatMoney, euroInputToCents } from "@/lib/money";
import type { SavingsGoal } from "@/lib/queries/goals";

export function GoalsManager({
  goals,
  currency,
}: {
  goals: SavingsGoal[];
  currency: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    const cents = euroInputToCents(target);
    if (!name.trim() || cents == null || cents <= 0) return;
    setBusy(true);
    await createGoal({ name: name.trim(), targetCents: cents });
    setName("");
    setTarget("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-hairline bg-surface p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. Trip to Japan)"
            maxLength={80}
            className="flex-1 rounded-xl border border-hairline bg-bg px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
          />
          <input
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Target €"
            className="w-full rounded-xl border border-hairline bg-bg px-3.5 py-2.5 text-right font-mono text-sm tabular-nums outline-none placeholder:text-muted focus:border-muted sm:w-32"
          />
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

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-hairline py-14 text-center">
          <PiggyBank className="h-7 w-7 text-muted" />
          <p className="mt-3 text-sm font-medium">No goals</p>
          <p className="mt-1 text-xs text-muted">
            Create a target and watch your savings grow.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  currency,
}: {
  goal: SavingsGoal;
  currency: string;
}) {
  const router = useRouter();
  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const pct = Math.min(
    100,
    Math.round((goal.savedCents / goal.targetCents) * 100),
  );
  const done = goal.savedCents >= goal.targetCents;

  async function contribute(sign: 1 | -1) {
    const cents = euroInputToCents(amt);
    if (cents == null) return;
    setBusy(true);
    await contributeGoal(goal.id, sign * cents);
    setAmt("");
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    await deleteGoal(goal.id);
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-hairline bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{goal.name}</p>
          <p className="mt-0.5 text-sm text-muted">
            <span className="font-mono tabular-nums">
              {formatMoney(goal.savedCents, currency)}
            </span>{" "}
            of{" "}
            <span className="font-mono tabular-nums">
              {formatMoney(goal.targetCents, currency)}
            </span>
          </p>
        </div>
        <button
          onClick={remove}
          disabled={busy}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-over"
          aria-label="Delete goal"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: done ? "var(--good)" : "var(--brand)",
          }}
        />
      </div>
      <p className="mt-1 text-right text-xs text-muted">{pct}%</p>

      <div className="mt-3 flex items-center gap-2">
        <input
          inputMode="decimal"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          placeholder="0,00"
          className="w-24 rounded-xl border border-hairline bg-bg px-3 py-1.5 text-right font-mono text-sm tabular-nums outline-none focus:border-muted"
        />
        <button
          onClick={() => contribute(1)}
          disabled={busy}
          className="rounded-xl bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          Add
        </button>
        <button
          onClick={() => contribute(-1)}
          disabled={busy}
          className="rounded-xl border border-hairline px-3 py-1.5 text-sm transition hover:bg-surface-2 disabled:opacity-50"
        >
          Withdraw
        </button>
      </div>
    </div>
  );
}
