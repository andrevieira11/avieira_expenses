import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { books } from "./books";
import { categories, subcategories } from "./categories";
import { ingestSourceEnum, txTypeEnum } from "./enums";

/**
 * Raw moey!/manual captures. `dedupeKey` is UNIQUE so re-POSTing the same notification
 * is idempotent. A transaction links back via transactions.sourceEventId.
 */
export const ingestEvents = pgTable(
  "ingest_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    dedupeKey: text("dedupe_key").notNull(),
    source: ingestSourceEnum("source").notNull().default("ios_share"),
    rawText: text("raw_text").notNull(),
    // Optional stable id from the bank (terminal / merchant / tx ref) for matching.
    externalId: text("external_id"),
    payload: jsonb("payload"),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    parseOk: boolean("parse_ok").notNull().default(false),
    parsedAmountCents: integer("parsed_amount_cents"),
    parsedMerchant: text("parsed_merchant"),
    parsedType: txTypeEnum("parsed_type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("ingest_events_dedupe_uq").on(t.dedupeKey),
    index("ingest_events_book_idx").on(t.bookId),
  ],
);

/**
 * Merchant -> category memory. Once "Continente" is categorized, future captures
 * pre-fill. Unique per (book, normalized merchant); highest hitCount wins on conflict.
 */
export const merchantRules = pgTable(
  "merchant_rules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    // A rule matches by external_id (preferred) and/or normalized merchant text.
    normalizedMerchant: text("normalized_merchant"),
    externalId: text("external_id"),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    subcategoryId: text("subcategory_id").references(() => subcategories.id, {
      onDelete: "set null",
    }),
    hitCount: integer("hit_count").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("merchant_rules_book_merchant_uq")
      .on(t.bookId, t.normalizedMerchant)
      .where(sql`normalized_merchant is not null`),
    uniqueIndex("merchant_rules_book_external_uq")
      .on(t.bookId, t.externalId)
      .where(sql`external_id is not null`),
  ],
);

export const ingestEventsRelations = relations(ingestEvents, ({ one }) => ({
  book: one(books, { fields: [ingestEvents.bookId], references: [books.id] }),
}));
