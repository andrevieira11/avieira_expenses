import { db } from "@/db/client";

/** Active categories for a book, each with its active subcategories, in display order. */
export async function getBookCategories(bookId: string) {
  return db.query.categories.findMany({
    where: (c, { eq, and }) => and(eq(c.bookId, bookId), eq(c.isArchived, false)),
    orderBy: (c, { asc }) => asc(c.sortOrder),
    with: {
      subcategories: {
        where: (s, { eq }) => eq(s.isArchived, false),
        orderBy: (s, { asc }) => asc(s.sortOrder),
      },
    },
  });
}

export type CategoryWithSubs = Awaited<
  ReturnType<typeof getBookCategories>
>[number];
