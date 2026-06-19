import "dotenv/config";
import { sql, eq } from "drizzle-orm";
import { db, pgClient } from "../client";
import { books, categories } from "../schema";
import { seedBookCategories } from "./seed-book-categories";

/**
 * Backfill: seed the category template into any book that has none. Categories are
 * normally seeded on signup; this is a safe, idempotent dev/backfill tool.
 * Run with `npm run db:seed`.
 */
async function main() {
  const allBooks = await db
    .select({ id: books.id, name: books.name })
    .from(books);

  if (allBooks.length === 0) {
    console.log("No books yet — categories are seeded automatically on signup.");
    return;
  }

  for (const b of allBooks) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(eq(categories.bookId, b.id));

    if (count > 0) {
      console.log(`✓ "${b.name}" already has ${count} categories`);
      continue;
    }
    await seedBookCategories(b.id);
    console.log(`+ seeded categories for "${b.name}"`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pgClient.end();
  });
