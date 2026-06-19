import { eq, asc, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { books, bookMembers, user } from "@/db/schema";

/** All books a user belongs to, with their role and the book's owner. */
export async function getUserBooksDetailed(userId: string) {
  return db
    .select({
      id: books.id,
      name: books.name,
      type: books.type,
      role: bookMembers.role,
      ownerId: books.ownerId,
    })
    .from(bookMembers)
    .innerJoin(books, eq(books.id, bookMembers.bookId))
    .where(eq(bookMembers.userId, userId))
    .orderBy(asc(books.createdAt));
}

/** Members (name/email/role) across a set of books. */
export async function getMembersForBooks(bookIds: string[]) {
  if (bookIds.length === 0) return [];
  return db
    .select({
      bookId: bookMembers.bookId,
      userId: bookMembers.userId,
      name: user.name,
      email: user.email,
      role: bookMembers.role,
    })
    .from(bookMembers)
    .innerJoin(user, eq(user.id, bookMembers.userId))
    .where(inArray(bookMembers.bookId, bookIds));
}

export type DetailedBook = Awaited<
  ReturnType<typeof getUserBooksDetailed>
>[number];
export type BookMemberRow = Awaited<
  ReturnType<typeof getMembersForBooks>
>[number];
