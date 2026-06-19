"use client";

import { motion, useReducedMotion } from "motion/react";
import { budgetHealthVar } from "@/lib/colors";
import { MoneyCountUp } from "./MoneyCountUp";

const SIZE = 220;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const ARC = 0.75; // 270° gauge
const TRACK = C * ARC;

export function BudgetGauge({
  spentCents,
  budgetCents,
  currency,
}: {
  spentCents: number;
  budgetCents: number | null;
  currency: string;
}) {
  const reduce = useReducedMotion();
  const hasBudget = budgetCents != null && budgetCents > 0;
  const rawRatio = hasBudget ? spentCents / budgetCents : 0;
  const ratio = Math.min(Math.max(rawRatio, 0), 1);
  const filled = TRACK * (hasBudget ? ratio : 1);
  const color = hasBudget ? budgetHealthVar(rawRatio) : "var(--cat-slate)";

  const remaining = hasBudget ? budgetCents - spentCents : null;
  const centerCents = hasBudget ? Math.abs(remaining!) : spentCents;
  const centerLabel = hasBudget
    ? remaining! >= 0
      ? "Disponível"
      : "Acima"
    : "Gasto";

  return (
    <div className="relative grid place-items-center">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-[135deg]"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${TRACK} ${C}`}
        />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${C}` }}
          animate={{ strokeDasharray: `${filled} ${C}` }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.32, 0.72, 0, 1] }}
        />
      </svg>

      <div className="absolute text-center">
        <p className="text-xs text-muted">{centerLabel}</p>
        <p className="font-mono text-2xl font-semibold tabular-nums">
          <MoneyCountUp cents={centerCents} currency={currency} />
        </p>
        {hasBudget && (
          <p className="mt-0.5 text-xs text-muted">
            de {(budgetCents! / 100).toLocaleString("pt-PT")} €
          </p>
        )}
      </div>
    </div>
  );
}
