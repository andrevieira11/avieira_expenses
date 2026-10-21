"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import { MORTGAGE, addMonths, loanStatus, simulate } from "@/lib/mortgage";

const monthYear = (ymd: string) =>
  new Intl.DateTimeFormat("en-IE", { month: "short", year: "numeric" }).format(
    new Date(`${ymd}T12:00:00`),
  );

const duration = (months: number) => {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} yr`, m && `${m} mo`].filter(Boolean).join(" ") || "0 mo";
};

const euros = (cents: number) => formatMoney(Math.round(cents / 100) * 100);

const VARIABLE_FROM = MORTGAGE.variableFrom;
const FIXED_LAST = addMonths(VARIABLE_FROM, -1);
const CONTRACT_RATE = Math.round((MORTGAGE.euriborAtSigningPct + MORTGAGE.spreadPct) * 10) / 10;

export function MortgageSimulator({ today }: { today: string }) {
  const status = useMemo(() => loanStatus(MORTGAGE, today), [today]);
  const [lump, setLump] = useState(10000);
  const [extra, setExtra] = useState(0);
  const [laterRate, setLaterRate] = useState(CONTRACT_RATE);
  const [mode, setMode] = useState<"shorter" | "lower">("shorter");

  const sim = useMemo(
    () =>
      simulate(MORTGAGE, today, {
        lumpCents: lump * 100,
        extraMonthlyCents: extra * 100,
        laterRatePct: laterRate,
        mode,
      }),
    [today, lump, extra, laterRate, mode],
  );

  // The same lump paid on the first variable-rate instalment instead, when the fee drops to 0.5%.
  const wait = useMemo(
    () =>
      today < VARIABLE_FROM && lump > 0
        ? simulate(MORTGAGE, FIXED_LAST.slice(0, 8) + "20", {
            lumpCents: lump * 100,
            extraMonthlyCents: extra * 100,
            laterRatePct: laterRate,
            mode,
          })
        : null,
    [today, lump, extra, laterRate, mode],
  );

  const pct = (status.paidCents / MORTGAGE.principalCents) * 100;
  const maxLump = Math.floor(status.balanceCents / 100 / 1000) * 1000;

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-3xl border border-hairline bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs text-muted">Still owed</p>
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {formatMoney(status.balanceCents)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Paid off</p>
            <p className="font-mono text-lg tabular-nums">{pct.toFixed(1)}%</p>
          </div>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-bg">
          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(pct, 0.5)}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Fact label="Next payment" value={`${formatMoney(MORTGAGE.paymentCents)} · ${status.nextPayment.slice(8)}/${status.nextPayment.slice(5, 7)}`} />
          <Fact label="Payments" value={`${status.paymentsMade} of ${status.paymentsTotal}`} />
          <Fact label="Rate" value={`${MORTGAGE.fixedRatePct}% fixed to ${monthYear(FIXED_LAST)}`} />
          <Fact label="Ends" value={monthYear(MORTGAGE.lastPayment)} />
        </div>
        <p className="text-xs text-muted">
          Interest still to pay if nothing changes: {euros(sim.base.interestCents)}
        </p>
      </section>

      <section className="space-y-5 rounded-3xl border border-hairline bg-surface p-5">
        <h2 className="text-base font-semibold">What if I pay extra?</h2>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="lump" className="text-sm">Pay now</label>
            <span className="font-mono text-sm tabular-nums">{formatMoney(lump * 100)}</span>
          </div>
          <input id="lump" type="range" min={0} max={Math.min(maxLump, 150000)} step={500}
            value={lump} onChange={(e) => setLump(Number(e.target.value))} className="w-full accent-[var(--color-brand)]" />
          <div className="flex flex-wrap gap-2">
            {[5000, 10000, 20000, 50000].map((v) => (
              <button key={v} onClick={() => setLump(v)}
                className={`rounded-full border px-3 py-1 text-xs ${lump === v ? "border-brand text-brand" : "border-hairline text-muted"}`}>
                {formatMoney(v * 100)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="extra" className="text-sm">Extra every month</label>
            <span className="font-mono text-sm tabular-nums">{formatMoney(extra * 100)}</span>
          </div>
          <input id="extra" type="range" min={0} max={1500} step={25}
            value={extra} onChange={(e) => setExtra(Number(e.target.value))} className="w-full accent-[var(--color-brand)]" />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="rate" className="text-sm">Rate from {monthYear(VARIABLE_FROM)} (Euribor 6M + {MORTGAGE.spreadPct.toFixed(2)}%)</label>
            <span className="font-mono text-sm tabular-nums">{laterRate.toFixed(1)}%</span>
          </div>
          <input id="rate" type="range" min={1} max={6} step={0.1}
            value={laterRate} onChange={(e) => setLaterRate(Number(e.target.value))} className="w-full accent-[var(--color-brand)]" />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-bg p-1 text-sm">
          {(["shorter", "lower"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-xl py-2 ${mode === m ? "bg-surface font-medium shadow-sm" : "text-muted"}`}>
              {m === "shorter" ? "Finish sooner" : "Lower instalment"}
            </button>
          ))}
        </div>

        {sim.plan.never ? (
          <p className="text-sm text-muted">At that rate the instalment no longer covers the interest.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Result label="Ends" value={sim.plan.months === 0 ? "Paid off now" : monthYear(sim.plan.endDate)}
              hint={sim.monthsSaved > 0 ? `${duration(sim.monthsSaved)} sooner` : "same date"} />
            <Result label="Monthly instalment" value={formatMoney(sim.plan.paymentNowCents + extra * 100)}
              hint={sim.plan.paymentNowCents < MORTGAGE.paymentCents ? `${formatMoney(MORTGAGE.paymentCents - sim.plan.paymentNowCents)} less` : "same"} />
            <Result label="Interest saved" value={euros(sim.interestSavedCents)} good />
            <Result label="Bank fee (max)" value={formatMoney(sim.feeCents)}
              hint={today < VARIABLE_FROM ? "2% while fixed + stamp duty" : "0.5% + stamp duty"} />
            <div className="col-span-2 rounded-2xl bg-bg p-3">
              <p className="text-xs text-muted">Net gain after the fee</p>
              <p className="font-mono text-xl font-semibold tabular-nums">{euros(sim.netSavedCents)}</p>
              {wait && (
                <p className="mt-1 text-xs text-muted">
                  Waiting until {monthYear(VARIABLE_FROM)} (0.5% fee): {euros(wait.netSavedCents)}.{" "}
                  {sim.netSavedCents >= wait.netSavedCents
                    ? `Paying now is ${euros(sim.netSavedCents - wait.netSavedCents)} better.`
                    : `Waiting is ${euros(wait.netSavedCents - sim.netSavedCents)} better.`}
                </p>
              )}
            </div>
          </div>
        )}
        <p className="text-xs text-muted">
          From the BPI contract: {MORTGAGE.fixedRatePct}% fixed for 36 instalments, then Euribor 6M + {MORTGAGE.spreadPct.toFixed(2)}%
          ({CONTRACT_RATE}% at signing) while you keep the salary account, life and home insurance at BPI, otherwise
          + 1.50%. Extra payments go on an instalment date, asked 7 working days before. Ask BPI for the exact figure first.
        </p>
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Result({ label, value, hint, good }: { label: string; value: string; hint?: string; good?: boolean }) {
  return (
    <div className="rounded-2xl bg-bg p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-mono text-base font-semibold tabular-nums ${good ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
