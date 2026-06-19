import {
  pgTable,
  text,
  timestamp,
  index,
  primaryKey,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { user } from "./auth";
import { bookTypeEnum, bookRoleEnum, inviteStatusEnum } from "./enums";

/** A ledger. Single user starts with one personal book; couples can share a "shared" one. */
export const books = pgTable(
  "books",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    type: bookTypeEnum("type").notNull().default("personal"),
    currency: text("currency").notNull().default("EUR"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    archivedAt: timestamp("archived_at"),
    // Background 8h cron pulls this book's banks only when true (per-book toggle).
    // Manual "Sync now" and sync-on-open ignore this — they're user-initiated.
    autoSync: boolean("auto_sync").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("books_owner_id_idx").on(t.ownerId)],
);

/** Membership join. "list my books" is a hot path (book switcher on every page). */
export const bookMembers = pgTable(
  "book_members",
  {
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: bookRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.bookId, t.userId] }),
    index("book_members_user_id_idx").on(t.userId),
  ],
);

/** Present from day one (cheap); drives shared-book sharing later. */
export const bookInvites = pgTable(
  "book_invites",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: bookRoleEnum("role").notNull().default("member"),
    token: text("token").notNull().unique(),
    status: inviteStatusEnum("status").notNull().default("pending"),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("book_invites_email_idx").on(t.email)],
);

export const booksRelations = relations(books, ({ many, one }) => ({
  members: many(bookMembers),
  owner: one(user, { fields: [books.ownerId], references: [user.id] }),
}));

export const bookMembersRelations = relations(bookMembers, ({ one }) => ({
  book: one(books, { fields: [bookMembers.bookId], references: [books.id] }),
  user: one(user, { fields: [bookMembers.userId], references: [user.id] }),
}));
