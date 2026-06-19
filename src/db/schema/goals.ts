import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { books } from "./books";

/** Savings goals — a target you contribute toward (makes "Saved" aspirational). */
export const savingsGoals = pgTable(
  "savings_goals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetCents: integer("target_cents").notNull(),
    savedCents: integer("saved_cents").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("savings_goals_book_idx").on(t.bookId)],
);

export const savingsGoalsRelations = relations(savingsGoals, ({ one }) => ({
  book: one(books, { fields: [savingsGoals.bookId], references: [books.id] }),
}));
