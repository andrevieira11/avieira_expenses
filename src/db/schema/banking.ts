import {
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { books } from "./books";

/** A GoCardless requisition linking a bank (e.g. Crédito Agrícola / moey!) to a book. */
export const bankConnections = pgTable(
  "bank_connections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    institutionId: text("institution_id").notNull(),
    institutionName: text("institution_name").notNull(),
    requisitionId: text("requisition_id").notNull(),
    reference: text("reference").notNull().unique(),
    agreementId: text("agreement_id"),
    status: text("status").notNull().default("created"), // created | linked | error
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("bank_connections_book_idx").on(t.bookId)],
);

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => bankConnections.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull().unique(),
    name: text("name"),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("bank_accounts_book_idx").on(t.bookId)],
);

export const bankConnectionsRelations = relations(
  bankConnections,
  ({ many, one }) => ({
    accounts: many(bankAccounts),
    book: one(books, {
      fields: [bankConnections.bookId],
      references: [books.id],
    }),
  }),
);

export const bankAccountsRelations = relations(bankAccounts, ({ one }) => ({
  connection: one(bankConnections, {
    fields: [bankAccounts.connectionId],
    references: [bankConnections.id],
  }),
}));
