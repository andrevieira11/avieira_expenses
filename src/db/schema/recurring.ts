import {
  pgTable,
  text,
  integer,
  date,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { books } from "./books";
import { categories, subcategories } from "./categories";
import { recurrenceCadenceEnum } from "./enums";

/** Subscriptions / recurring spend (the "Subs" subcategory). Drives renewal reminders. */
export const recurringExpenses = pgTable(
  "recurring_expenses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),

    cadence: recurrenceCadenceEnum("cadence").notNull().default("monthly"),
    intervalCount: integer("interval_count").notNull().default(1),
    nextDue: date("next_due").notNull(),
    endsOn: date("ends_on"),

    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    subcategoryId: text("subcategory_id").references(() => subcategories.id, {
      onDelete: "set null",
    }),

    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("recurring_due_idx").on(t.isActive, t.nextDue),
    index("recurring_book_id_idx").on(t.bookId),
  ],
);

export const recurringExpensesRelations = relations(
  recurringExpenses,
  ({ one }) => ({
    book: one(books, {
      fields: [recurringExpenses.bookId],
      references: [books.id],
    }),
  }),
);
