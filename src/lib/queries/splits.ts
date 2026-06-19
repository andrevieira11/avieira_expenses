import { db } from "@/db/client";

/** Splits for a book with their participants, newest first. */
export async function getSplits(bookId: string) {
  return db.query.splits.findMany({
    where: (s, { eq }) => eq(s.bookId, bookId),
    orderBy: (s, { desc }) => desc(s.createdAt),
    with: {
      participants: { orderBy: (p, { asc }) => asc(p.createdAt) },
    },
  });
}

export type SplitWithParticipants = Awaited<
  ReturnType<typeof getSplits>
>[number];
