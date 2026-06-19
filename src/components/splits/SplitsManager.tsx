"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, HandCoins } from "lucide-react";
import {
  createSplit,
  markParticipantPaid,
  markParticipantUnpaid,
  deleteSplit,
} from "@/lib/actions/splits";
import { formatMoney, euroInputToCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { SplitWithParticipants } from "@/lib/queries/splits";

export function SplitsManager({
  splits,
  currency,
}: {
  splits: SplitWithParticipants[];
  currency: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState([{ name: "", amount: "" }]);
  const [busy, setBusy] = useState(false);

  function setRow(i: number, field: "name" | "amount", v: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: v } : r)));
  }

  async function create() {
    const participants = rows
      .map((r) => ({
        name: r.name.trim(),
        shareCents: euroInputToCents(r.amount) ?? 0,
      }))
      .filter((p) => p.name && p.shareCents > 0);
    if (!title.trim() || participants.length === 0) return;
    setBusy(true);
    await createSplit({ title: title.trim(), participants });
    setTitle("");
    setRows([{ name: "", amount: "" }]);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-3xl border border-hairline bg-surface p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (ex: Jantar de equipa)"
          maxLength={80}
          className="w-full rounded-xl border border-hairline bg-bg px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
        />
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={r.name}
              onChange={(e) => setRow(i, "name", e.target.value)}
              placeholder="Nome"
              maxLength={60}
              className="flex-1 rounded-xl border border-hairline bg-bg px-3.5 py-2 text-sm outline-none placeholder:text-muted focus:border-muted"
            />
            <input
              value={r.amount}
              onChange={(e) => setRow(i, "amount", e.target.value)}
              inputMode="decimal"
              placeholder="€"
              className="w-24 rounded-xl border border-hairline bg-bg px-3 py-2 text-right font-mono text-sm tabular-nums outline-none placeholder:text-muted focus:border-muted"
            />
            {rows.length > 1 && (
              <button
                onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:text-over"
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setRows((rs) => [...rs, { name: "", amount: "" }])}
            className="text-sm font-medium text-muted hover:text-fg"
          >
            + pessoa
          </button>
          <button
            onClick={create}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Criar acerto
          </button>
        </div>
      </div>

      {splits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-hairline py-14 text-center">
          <HandCoins className="h-7 w-7 text-muted" />
          <p className="mt-3 text-sm font-medium">Sem acertos</p>
          <p className="mt-1 text-xs text-muted">
            Divide uma despesa e acompanha quem já pagou.
          </p>
        </div>
      ) : (
        splits.map((s) => <SplitCard key={s.id} split={s} currency={currency} />)
      )}
    </div>
  );
}

function SplitCard({
  split,
  currency,
}: {
  split: SplitWithParticipants;
  currency: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const remaining = split.participants
    .filter((p) => !p.paid)
    .reduce((s, p) => s + p.shareCents, 0);

  async function toggle(id: string, paid: boolean) {
    setBusy(true);
    if (paid) await markParticipantUnpaid(id);
    else await markParticipantPaid(id);
    setBusy(false);
    router.refresh();
  }
  async function remove() {
    setBusy(true);
    await deleteSplit(split.id);
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-hairline bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{split.title}</p>
          <p className="text-xs text-muted">
            Total {formatMoney(split.totalCents, currency)} ·{" "}
            {remaining > 0 ? (
              <span style={{ color: "var(--over)" }}>
                falta {formatMoney(remaining, currency)}
              </span>
            ) : (
              <span style={{ color: "var(--good)" }}>tudo pago</span>
            )}
          </p>
        </div>
        <button
          onClick={remove}
          disabled={busy}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:text-over"
          aria-label="Apagar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-hairline pt-3">
        {split.participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3">
            <span className={cn("text-sm", p.paid && "text-muted line-through")}>
              {p.name}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm tabular-nums">
                {formatMoney(p.shareCents, currency)}
              </span>
              <button
                onClick={() => toggle(p.id, p.paid)}
                disabled={busy}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition",
                  p.paid
                    ? "text-good"
                    : "border border-hairline hover:bg-surface-2",
                )}
              >
                {p.paid ? (
                  <>
                    <Check className="h-3 w-3" />
                    Pago
                  </>
                ) : (
                  "Marcar pago"
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
