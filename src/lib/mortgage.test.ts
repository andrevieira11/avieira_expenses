/**
 * Pure-logic checks for the mortgage math. Run: `npx tsx src/lib/mortgage.test.ts`.
 * No framework — asserts and exits non-zero on failure.
 */
import assert from "node:assert/strict";
import {
  MORTGAGE,
  addMonths,
  annuity,
  loanStatus,
  monthsToClear,
  simulate,
} from "./mortgage";

// The contract: €320,000 over 408 instalments at 2.4% gives BPI's €1,148.10.
assert.ok(Math.abs(annuity(MORTGAGE.principalCents, 2.4, 408) - MORTGAGE.paymentCents) <= 1);

// The bank's instalment is the plain annuity of the balance over the remaining term.
assert.ok(Math.abs(annuity(31744932, 2.4, 403) - MORTGAGE.paymentCents) <= 1);
assert.equal(monthsToClear(31744932, MORTGAGE.paymentCents, 2.4), 403);

assert.equal(addMonths("2026-12-05", 1), "2027-01-05");
assert.equal(addMonths("2027-01-05", -1), "2026-12-05");

// Status on the day of the known balance, and one instalment later.
const s0 = loanStatus(MORTGAGE, "2026-10-21");
assert.equal(s0.balanceCents, 31744932); // BPI statement, 19 Oct 2026
assert.equal(s0.nextPayment, "2026-11-05");
assert.equal(s0.paymentsMade, 5);
assert.equal(s0.paymentsTotal, 408);
const s1 = loanStatus(MORTGAGE, "2026-11-05");
assert.equal(s1.balanceCents, 31744932 - 51320); // BPI's announced Nov capital: 513,20

// Paying nothing extra ends on the contract date and saves nothing.
const none = simulate(MORTGAGE, "2026-10-21", { lumpCents: 0, extraMonthlyCents: 0, laterRatePct: 2.4, mode: "shorter" });
assert.equal(none.base.endDate, MORTGAGE.lastPayment);
assert.equal(none.monthsSaved, 0);
assert.equal(none.interestSavedCents, 0);

// €10k now: shorter term saves months; lower payment keeps the end date.
const shorter = simulate(MORTGAGE, "2026-10-21", { lumpCents: 1000000, extraMonthlyCents: 0, laterRatePct: 2.4, mode: "shorter" });
assert.ok(shorter.monthsSaved > 12, `months saved ${shorter.monthsSaved}`);
assert.equal(shorter.feeCents, 20800); // 2% + 4% stamp duty
assert.ok(shorter.interestSavedCents > shorter.feeCents);
const lower = simulate(MORTGAGE, "2026-10-21", { lumpCents: 1000000, extraMonthlyCents: 0, laterRatePct: 2.4, mode: "lower" });
assert.equal(lower.plan.endDate, MORTGAGE.lastPayment);
assert.ok(lower.plan.paymentNowCents < MORTGAGE.paymentCents);
assert.ok(shorter.interestSavedCents > lower.interestSavedCents);

// Paying everything clears it.
const all = simulate(MORTGAGE, "2026-10-21", { lumpCents: 99999999, extraMonthlyCents: 0, laterRatePct: 2.4, mode: "shorter" });
assert.equal(all.plan.months, 0);
assert.equal(all.feeCents, Math.round(31744932 * 0.02 * 1.04));

console.log("mortgage: ok");
