import { db } from "@/db/client";

/** Bank connections for a book with their linked accounts. */
export async function getBankConnections(bookId: string) {
  const rows = await db.query.bankConnections.findMany({
    where: (c, { eq }) => eq(c.bookId, bookId),
    orderBy: (c, { desc }) => desc(c.createdAt),
    with: { accounts: true },
  });
  // Drop orphaned connections: linked, but their account was re-homed to another book.
  // (A still-pending "awaiting consent" connection legitimately has 0 accounts — keep it.)
  return rows.filter((c) => c.status !== "linked" || c.accounts.length > 0);
}

export type BankConnectionWithAccounts = Awaited<
  ReturnType<typeof getBankConnections>
>[number];
