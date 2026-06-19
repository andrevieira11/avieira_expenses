import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { books } from "./books";
import { user } from "./auth";
import { transactions } from "./transactions";

/** A shared expense ("acerto") split among people — track who has paid you back. */
export const splits = pgTable(
  "splits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    totalCents: integer("total_cents").notNull().default(0),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("splits_book_idx").on(t.bookId)],
);

export const splitParticipants = pgTable(
  "split_participants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    splitId: text("split_id")
      .notNull()
      .references(() => splits.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    shareCents: integer("share_cents").notNull(),
    paid: boolean("paid").notNull().default(false),
    // The income transaction created when this person paid (so unpay can remove it).
    txId: text("tx_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("split_participants_split_idx").on(t.splitId)],
);

export const splitsRelations = relations(splits, ({ many, one }) => ({
  participants: many(splitParticipants),
  book: one(books, { fields: [splits.bookId], references: [books.id] }),
}));

export const splitParticipantsRelations = relations(
  splitParticipants,
  ({ one }) => ({
    split: one(splits, {
      fields: [splitParticipants.splitId],
      references: [splits.id],
    }),
  }),
);
