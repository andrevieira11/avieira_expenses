import {
  pgTable,
  text,
  integer,
  date,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { books } from "./books";
import { categories } from "./categories";
import { user } from "./auth";
import { budgetScopeEnum } from "./enums";

/**
 * Effective-dated budgets. A month M uses the latest row with effective_from <= M's
 * first day (per scope/category). Setting a budget = INSERT/upsert; it changes future
 * months only and never rewrites the past.
 */
export const budgets = pgTable(
  "budgets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),

    scope: budgetScopeEnum("scope").notNull().default("overall"),
    // NULL when scope = 'overall'; set when scope = 'category'.
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "cascade",
    }),

    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),

    // Always the first day of the month (YYYY-MM-01) this value becomes effective.
    effectiveFrom: date("effective_from").notNull(),

    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("budgets_resolve_idx").on(
      t.bookId,
      t.scope,
      t.categoryId,
      t.effectiveFrom,
    ),
    // One overall budget per month (NULL category wouldn't collide in a plain unique).
    uniqueIndex("budgets_overall_period_uq")
      .on(t.bookId, t.effectiveFrom)
      .where(sql`${t.scope} = 'overall'`),
    // One per-category budget per month.
    uniqueIndex("budgets_category_period_uq")
      .on(t.bookId, t.categoryId, t.effectiveFrom)
      .where(sql`${t.scope} = 'category'`),
  ],
);

export const budgetsRelations = relations(budgets, ({ one }) => ({
  book: one(books, { fields: [budgets.bookId], references: [books.id] }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));
