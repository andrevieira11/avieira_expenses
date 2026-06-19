import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { savingsGoals } from "@/db/schema";

export async function getGoals(bookId: string) {
  return db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.bookId, bookId))
    .orderBy(asc(savingsGoals.createdAt));
}

export type SavingsGoal = Awaited<ReturnType<typeof getGoals>>[number];
