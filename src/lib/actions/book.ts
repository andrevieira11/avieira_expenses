"use server";

import { cookies } from "next/headers";
import { getServerSession } from "@/lib/auth-session";
import { getUserBooks } from "@/lib/queries/books";
import { ACTIVE_BOOK_COOKIE } from "@/lib/constants";

/** Persist the active book in a cookie, after validating the user is a member. */
export async function setActiveBook(bookId: string) {
  const session = await getServerSession();
  if (!session) return;

  const books = await getUserBooks(session.user.id);
  if (!books.some((b) => b.id === bookId)) return;

  const store = await cookies();
  store.set(ACTIVE_BOOK_COOKIE, bookId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
