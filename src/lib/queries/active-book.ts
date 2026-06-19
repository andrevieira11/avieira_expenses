import { cache } from "react";
import { cookies } from "next/headers";
import { getServerSession } from "@/lib/auth-session";
import { getUserBooks, type UserBook } from "./books";
import { ACTIVE_BOOK_COOKIE } from "@/lib/constants";

export type ActiveContext = {
  user: { id: string; name: string; email: string };
  book: UserBook;
};

/**
 * Resolve the current user + their active book on the server (deduped per request).
 * Pages call this to scope every query by book_id. Returns null when unauthenticated.
 */
export const getActiveBook = cache(async (): Promise<ActiveContext | null> => {
  const session = await getServerSession();
  if (!session) return null;

  const books = await getUserBooks(session.user.id);
  if (books.length === 0) return null;

  const store = await cookies();
  const preferred = store.get(ACTIVE_BOOK_COOKIE)?.value;
  const book = books.find((b) => b.id === preferred) ?? books[0];

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    book,
  };
});
