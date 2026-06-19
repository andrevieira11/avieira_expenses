import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { books } from "./books";

/**
 * Per-book categories, seeded from a global template on book creation. Per-book rows
 * (not a shared global table) let a couple rename/recolor/reorder without corrupting
 * another book's history. `slug` is the stable join key and keeps the seed idempotent.
 */
export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color").notNull(), // palette token: amber | green | orange | blue | slate
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("categories_book_slug_uq").on(t.bookId, t.slug),
    index("categories_book_id_idx").on(t.bookId),
  ],
);

export const subcategories = pgTable(
  "subcategories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("subcategories_cat_slug_uq").on(t.categoryId, t.slug),
    index("subcategories_book_id_idx").on(t.bookId),
    index("subcategories_category_id_idx").on(t.categoryId),
  ],
);

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  subcategories: many(subcategories),
  book: one(books, { fields: [categories.bookId], references: [books.id] }),
}));

export const subcategoriesRelations = relations(subcategories, ({ one }) => ({
  category: one(categories, {
    fields: [subcategories.categoryId],
    references: [categories.id],
  }),
}));
