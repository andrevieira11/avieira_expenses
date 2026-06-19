import { pgEnum } from "drizzle-orm/pg-core";

/** A book is one person's ledger ("personal") or a shared household one ("shared"/conjoint). */
export const bookTypeEnum = pgEnum("book_type", ["personal", "shared"]);
export const bookRoleEnum = pgEnum("book_role", ["owner", "member"]);
export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

/** Money semantics. Sign carries the math (expense > 0, refund/income < 0); type carries meaning. */
export const txTypeEnum = pgEnum("tx_type", ["expense", "income", "refund"]);
export const txSourceEnum = pgEnum("tx_source", [
  "manual",
  "moey",
  "import",
  "bank",
]);
export const txStatusEnum = pgEnum("tx_status", ["confirmed", "pending_category"]);

/** Budgets are effective-dated; scope is the overall monthly budget or a per-category one. */
export const budgetScopeEnum = pgEnum("budget_scope", ["overall", "category"]);

export const recurrenceCadenceEnum = pgEnum("recurrence_cadence", [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);

/** How a moey!/manual capture entered the ingest pipeline. */
export const ingestSourceEnum = pgEnum("ingest_source", [
  "ios_share",
  "ios_manual",
  "ios_automation",
  "api",
]);
