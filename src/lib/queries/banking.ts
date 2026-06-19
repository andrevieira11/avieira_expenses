import { db } from "@/db/client";

/** Bank connections for a book with their linked accounts. */
export async function getBankConnections(bookId: string) {
  return db.query.bankConnections.findMany({
    where: (c, { eq }) => eq(c.bookId, bookId),
    orderBy: (c, { desc }) => desc(c.createdAt),
    with: { accounts: true },
  });
}

export type BankConnectionWithAccounts = Awaited<
  ReturnType<typeof getBankConnections>
>[number];
