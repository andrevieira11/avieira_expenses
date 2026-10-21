/**
 * House mortgage math (BPI "C.HABITACAO TX MISTA"). Pure functions on integer cents and
 * YYYY-MM-DD strings; instalments fall on the 5th. The loan facts come from the BPI app.
 */

export type Loan = {
  name: string;
  /** Balance right after the instalment on `knownAfter`, as shown in the bank app. */
  knownBalanceCents: number;
  knownAfter: string;
  /** Opening principal, worked back from the instalment, rate and term. */
  principalCents: number;
  paymentCents: number;
  firstPayment: string;
  lastPayment: string;
  /** Annual rate in percent while fixed, and the day the fixed period ends. */
  fixedRatePct: number;
  fixedUntil: string;
};

export const MORTGAGE: Loan = {
  name: "BPI house mortgage",
  knownBalanceCents: 31744932,
  knownAfter: "2026-10-05",
  principalCents: 32050709,
  paymentCents: 114810,
  firstPayment: "2026-05-05",
  lastPayment: "2060-05-05",
  fixedRatePct: 2.4,
  fixedUntil: "2029-05-05",
};

/** Early repayment fee caps in Portugal (DL 74-A/2017): 2% while the rate is fixed, 0.5% when variable. */
export const FEE_FIXED_PCT = 2;
export const FEE_VARIABLE_PCT = 0.5;

export function addMonths(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function monthsBetween(from: string, to: string): number {
  const [y1, m1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

/** Rounding leftovers under €1 are folded into the final instalment, as banks do. */
const LEFTOVER_CENTS = 100;

/** Interest for one month on a balance at an annual percent rate, in whole cents. */
export function monthlyInterest(balanceCents: number, ratePct: number): number {
  return Math.round((balanceCents * ratePct) / 1200);
}

/** The level instalment that clears `balanceCents` in `months` payments (rounded up, so it always does). */
export function annuity(balanceCents: number, ratePct: number, months: number): number {
  if (months <= 0) return balanceCents;
  const r = ratePct / 1200;
  if (r === 0) return Math.ceil(balanceCents / months);
  return Math.ceil((balanceCents * r) / (1 - Math.pow(1 + r, -months)));
}

/** How many payments of `paymentCents` clear the balance at a fixed rate (Infinity if never). */
export function monthsToClear(balanceCents: number, paymentCents: number, ratePct: number): number {
  let b = balanceCents;
  let n = 0;
  while (b > 0) {
    const principal = paymentCents - monthlyInterest(b, ratePct);
    if (principal <= 0) return Infinity;
    b = b - principal < LEFTOVER_CENTS ? 0 : b - principal;
    if (++n > 1200) return Infinity;
  }
  return n;
}

/** Where the loan stands on `today`: balance, payments made and the next instalment date. */
export function loanStatus(loan: Loan, today: string) {
  let balance = loan.knownBalanceCents;
  let last = loan.knownAfter;
  while (addMonths(last, 1) <= today && balance > 0) {
    balance -= Math.min(loan.paymentCents - monthlyInterest(balance, loan.fixedRatePct), balance);
    last = addMonths(last, 1);
  }
  const made = monthsBetween(loan.firstPayment, last) + 1;
  const total = monthsBetween(loan.firstPayment, loan.lastPayment) + 1;
  return {
    balanceCents: balance,
    paidCents: loan.principalCents - balance,
    lastPayment: last,
    nextPayment: addMonths(last, 1),
    paymentsMade: made,
    paymentsTotal: total,
  };
}

export type Plan = {
  months: number;
  endDate: string;
  interestCents: number;
  paymentNowCents: number;
  paymentAfterFixedCents: number;
  never: boolean;
};

/**
 * Runs the loan month by month from `nextPayment`. When the fixed period ends the bank
 * re-prices the instalment so the loan still ends when it would have at the old rate.
 */
export function runPlan(opts: {
  balanceCents: number;
  paymentCents: number;
  extraMonthlyCents: number;
  nextPayment: string;
  fixedUntil: string;
  fixedRatePct: number;
  laterRatePct: number;
}): Plan {
  let b = opts.balanceCents;
  let pay = opts.paymentCents;
  let payAfter = pay;
  let date = opts.nextPayment;
  let interest = 0;
  let months = 0;
  let repriced = opts.nextPayment >= opts.fixedUntil;
  if (repriced && opts.laterRatePct !== opts.fixedRatePct) {
    pay = annuity(b, opts.laterRatePct, monthsToClear(b, pay, opts.fixedRatePct));
  }
  payAfter = pay;
  while (b > 0) {
    if (!repriced && date >= opts.fixedUntil) {
      const left = monthsToClear(b, pay, opts.fixedRatePct);
      pay = annuity(b, opts.laterRatePct, left === Infinity ? 1200 : left);
      payAfter = pay;
      repriced = true;
    }
    const rate = date < opts.fixedUntil ? opts.fixedRatePct : opts.laterRatePct;
    const i = monthlyInterest(b, rate);
    const principal = pay + opts.extraMonthlyCents - i;
    if (principal <= 0 || months > 1200) {
      return { months, endDate: date, interestCents: interest, paymentNowCents: opts.paymentCents, paymentAfterFixedCents: payAfter, never: true };
    }
    b = b - principal < LEFTOVER_CENTS ? 0 : b - principal;
    interest += i;
    months++;
    date = addMonths(date, 1);
  }
  return {
    months,
    endDate: addMonths(date, -1),
    interestCents: interest,
    paymentNowCents: opts.paymentCents,
    paymentAfterFixedCents: payAfter,
    never: false,
  };
}

export type Simulation = {
  base: Plan;
  plan: Plan;
  feeCents: number;
  monthsSaved: number;
  interestSavedCents: number;
  netSavedCents: number;
};

/**
 * What paying `lumpCents` now (and `extraMonthlyCents` every month) does to the loan.
 * "shorter" keeps the instalment and ends earlier; "lower" keeps the end date and
 * lowers the instalment.
 */
export function simulate(
  loan: Loan,
  today: string,
  opts: { lumpCents: number; extraMonthlyCents: number; laterRatePct: number; mode: "shorter" | "lower" },
): Simulation {
  const s = loanStatus(loan, today);
  const common = {
    nextPayment: s.nextPayment,
    fixedUntil: loan.fixedUntil,
    fixedRatePct: loan.fixedRatePct,
    laterRatePct: opts.laterRatePct,
  };
  const base = runPlan({ ...common, balanceCents: s.balanceCents, paymentCents: loan.paymentCents, extraMonthlyCents: 0 });
  const lump = Math.min(Math.max(0, opts.lumpCents), s.balanceCents);
  const after = s.balanceCents - lump;
  const left = monthsBetween(s.nextPayment, loan.lastPayment) + 1;
  const payment =
    opts.mode === "lower" && lump > 0 ? annuity(after, loan.fixedRatePct, left) : loan.paymentCents;
  const plan =
    after <= 0
      ? { months: 0, endDate: today, interestCents: 0, paymentNowCents: 0, paymentAfterFixedCents: 0, never: false }
      : runPlan({ ...common, balanceCents: after, paymentCents: payment, extraMonthlyCents: Math.max(0, opts.extraMonthlyCents) });
  const feePct = today < loan.fixedUntil ? FEE_FIXED_PCT : FEE_VARIABLE_PCT;
  const feeCents = Math.round((lump * feePct) / 100);
  const interestSavedCents = base.interestCents - plan.interestCents;
  return {
    base,
    plan,
    feeCents,
    monthsSaved: base.months - plan.months,
    interestSavedCents,
    netSavedCents: interestSavedCents - feeCents,
  };
}
