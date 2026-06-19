"use client";

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "motion/react";
import { formatMoney } from "@/lib/money";

/** Animated money value that counts up on mount / when it changes. */
export function MoneyCountUp({
  cents,
  currency = "EUR",
}: {
  cents: number;
  currency?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? cents : 0);
  const text = useTransform(mv, (v) => formatMoney(Math.round(v), currency));

  useEffect(() => {
    const controls = animate(mv, cents, {
      duration: reduce ? 0 : 0.8,
      ease: [0.32, 0.72, 0, 1],
    });
    return () => controls.stop();
  }, [cents, mv, reduce]);

  return <motion.span>{text}</motion.span>;
}
