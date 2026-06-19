import { createId } from "@paralleldrive/cuid2";
import { db } from "../client";
import { categories, subcategories } from "../schema";
import { CATEGORY_TEMPLATE } from "./category-template";

/**
 * Seed a fresh book with the template categories + subcategories, in one transaction.
 * Idempotent on first run via the (book, slug) unique indexes. Called from the signup
 * hook when a user's default book is created, and from the backfill seed script.
 */
export async function seedBookCategories(bookId: string) {
  await db.transaction(async (tx) => {
    for (const cat of CATEGORY_TEMPLATE) {
      const categoryId = createId();
      await tx
        .insert(categories)
        .values({
          id: categoryId,
          bookId,
          name: cat.name,
          slug: cat.slug,
          color: cat.color,
          sortOrder: cat.sort,
        })
        .onConflictDoNothing({
          target: [categories.bookId, categories.slug],
        });

      await tx
        .insert(subcategories)
        .values(
          cat.subs.map((s, i) => ({
            id: createId(),
            bookId,
            categoryId,
            name: s.name,
            slug: s.slug,
            sortOrder: i,
          })),
        )
        .onConflictDoNothing({
          target: [subcategories.categoryId, subcategories.slug],
        });
    }
  });
}
