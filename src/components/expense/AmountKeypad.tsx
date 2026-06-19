"use client";

import { motion } from "motion/react";
import { Delete } from "lucide-react";
import { formatMoney } from "@/lib/money";

const MAX = 2_000_000_000; // 20M € cap
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "del"];

/**
 * Card-terminal style amount entry: digits append into the cents value, so typing
 * 1·2·3·4 reads as 12,34 €. No decimal key needed.
 */
export function AmountKeypad({
  cents,
  onChange,
  currency = "EUR",
}: {
  cents: number;
  onChange: (cents: number) => void;
  currency?: string;
}) {
  function press(k: string) {
    if (k === "del") return onChange(Math.floor(cents / 10));
    if (k === "00") return onChange(Math.min(cents * 100, MAX));
    return onChange(Math.min(cents * 10 + Number(k), MAX));
  }

  return (
    <div className="select-none">
      <div className="py-6 text-center">
        <div
          className={`font-mono text-5xl font-semibold tabular-nums tracking-tight ${
            cents === 0 ? "text-muted" : "text-fg"
          }`}
        >
          {formatMoney(cents, currency)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <motion.button
            key={k}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => press(k)}
            className="grid h-14 place-items-center rounded-2xl bg-surface-2 text-xl font-medium text-fg transition hover:brightness-95 active:brightness-90"
            aria-label={k === "del" ? "Apagar" : k}
          >
            {k === "del" ? <Delete className="h-5 w-5" /> : k}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
