"use client";

import { createContext, useContext } from "react";
import type { UserBook } from "@/lib/queries/books";

type BookContextValue = {
  books: UserBook[];
  activeBook: UserBook;
};

const BookContext = createContext<BookContextValue | null>(null);

export function BookProvider({
  books,
  activeBookId,
  children,
}: {
  books: UserBook[];
  activeBookId: string;
  children: React.ReactNode;
}) {
  const activeBook = books.find((b) => b.id === activeBookId) ?? books[0];
  return (
    <BookContext.Provider value={{ books, activeBook }}>
      {children}
    </BookContext.Provider>
  );
}

export function useBooks(): BookContextValue {
  const ctx = useContext(BookContext);
  if (!ctx) throw new Error("useBooks must be used within a BookProvider");
  return ctx;
}
