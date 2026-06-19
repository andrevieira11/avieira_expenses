import {
  pgTable,
  text,
  integer,
  date,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { books } from "./books";
import { categories, subcategories } from "./categories";
import { user } from "./auth";
import { ingestEvents } from "./ingest";
import { txTypeEnum, txSourceEnum, txStatusEnum } from "./enums";

export const transactions = pgTable(
  "transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),

    // Signed integer cents. expense >= 0; refund/income <= 0. NULL only for an
    // un-parsed moey! capture awaiting a manual amount. See the CHECK below.
    amountCents: integer("amount_cents"),
    currency: text("currency").notNull().default("EUR"),

    type: txTypeEnum("type").notNull().default("expense"),
    status: txStatusEnum("status").notNull().default("confirmed"),
    source: txSourceEnum("source").notNull().default("manual"),

    // The calendar day the spend belongs to. DATE (no timezone) so a purchase
    // never shifts across midnight.
    txDate: date("tx_date").notNull(),

    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    subcategoryId: text("subcategory_id").references(() => subcategories.id, {
      onDelete: "set null",
    }),

    merchant: text("merchant"),
    note: text("note"),
    rawText: text("raw_text"),
    // Optional stable bank id used to auto-categorize future same-id transactions.
    externalId: text("external_id"),
    // Filename of an attached receipt image (served via /api/receipts/[id]).
    receiptPath: text("receipt_path"),
    sourceEventId: text("source_event_id").references(() => ingestEvents.id, {
      onDelete: "set null",
    }),

    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("tx_book_date_idx").on(t.bookId, t.txDate),
    index("tx_book_category_date_idx").on(t.bookId, t.categoryId, t.txDate),
    index("tx_book_subcategory_date_idx").on(
      t.bookId,
      t.subcategoryId,
      t.txDate,
    ),
    // Pending inbox is a small minority of rows -> partial index.
    index("tx_pending_idx")
      .on(t.bookId, t.createdAt)
      .where(sql`${t.status} = 'pending_category'`),
    // Enforce sign <-> type. NULL amount allowed (un-parsed capture).
    check(
      "tx_sign_chk",
      sql`${t.amountCents} IS NULL
        OR (${t.type} = 'expense' AND ${t.amountCents} >= 0)
        OR (${t.type} IN ('refund', 'income') AND ${t.amountCents} <= 0)`,
    ),
  ],
);

export const transactionsRelations = relations(transactions, ({ one }) => ({
  book: one(books, { fields: [transactions.bookId], references: [books.id] }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  subcategory: one(subcategories, {
    fields: [transactions.subcategoryId],
    references: [subcategories.id],
  }),
  creator: one(user, {
    fields: [transactions.createdBy],
    references: [user.id],
  }),
}));
