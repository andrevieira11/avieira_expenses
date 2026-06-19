import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/db/client";
import { books, bookMembers } from "@/db/schema";
import { seedBookCategories } from "@/db/seed/seed-book-categories";

export type UserBook = {
  id: string;
  name: string;
  type: "personal" | "shared";
  currency: string;
  role: "owner" | "member";
};

/** All books the user is a member of (drives the book switcher). */
export async function getUserBooks(userId: string): Promise<UserBook[]> {
  return db
    .select({
      id: books.id,
      name: books.name,
      type: books.type,
      currency: books.currency,
      role: bookMembers.role,
    })
    .from(bookMembers)
    .innerJoin(books, eq(books.id, bookMembers.bookId))
    .where(eq(bookMembers.userId, userId));
}

/** Create a personal book owned by the user and seed it with the category template. */
export async function createPersonalBook(
  userId: string,
  name = "Pessoal",
): Promise<string> {
  const bookId = createId();
  await db
    .insert(books)
    .values({ id: bookId, name, type: "personal", ownerId: userId });
  await db
    .insert(bookMembers)
    .values({ bookId, userId, role: "owner" });
  await seedBookCategories(bookId);
  return bookId;
}

/** The user's default book id, creating one if the signup hook somehow didn't. */
export async function ensureDefaultBook(userId: string): Promise<string> {
  const existing = await getUserBooks(userId);
  return existing[0]?.id ?? (await createPersonalBook(userId));
}
