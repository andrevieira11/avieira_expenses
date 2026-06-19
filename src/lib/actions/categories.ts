"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, max } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/db/client";
import { categories, subcategories } from "@/db/schema";
import { getActiveBook } from "@/lib/queries/active-book";

export type ActionResult = { ok: true } | { ok: false; error: string };

const colorEnum = z.enum([
  "amber",
  "green",
  "orange",
  "blue",
  "slate",
  "rose",
  "purple",
  "teal",
  "cyan",
  "pink",
  "brown",
]);
const nameSchema = z.string().trim().min(1).max(40);

function revalidate() {
  revalidatePath("/settings/categories");
  revalidatePath("/add");
  revalidatePath("/budgets");
}

export async function createCategory(input: {
  name: string;
  color: string;
}): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Session expired" };
    const data = z.object({ name: nameSchema, color: colorEnum }).parse(input);
    const [agg] = await db
      .select({ m: max(categories.sortOrder) })
      .from(categories)
      .where(eq(categories.bookId, ctx.book.id));
    await db.insert(categories).values({
      bookId: ctx.book.id,
      name: data.name,
      slug: createId(),
      color: data.color,
      sortOrder: (agg?.m ?? -1) + 1,
    });
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateCategory(
  id: string,
  input: { name: string; color: string },
): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Session expired" };
    const data = z.object({ name: nameSchema, color: colorEnum }).parse(input);
    await db
      .update(categories)
      .set({ name: data.name, color: data.color })
      .where(and(eq(categories.id, id), eq(categories.bookId, ctx.book.id)));
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function archiveCategory(id: string): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Session expired" };
    await db
      .update(categories)
      .set({ isArchived: true })
      .where(and(eq(categories.id, id), eq(categories.bookId, ctx.book.id)));
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function createSubcategory(
  categoryId: string,
  name: string,
): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Session expired" };
    const n = nameSchema.parse(name);
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(eq(categories.id, categoryId), eq(categories.bookId, ctx.book.id)),
      )
      .limit(1);
    if (!cat) return { ok: false, error: "Invalid category" };
    const [agg] = await db
      .select({ m: max(subcategories.sortOrder) })
      .from(subcategories)
      .where(eq(subcategories.categoryId, categoryId));
    await db.insert(subcategories).values({
      bookId: ctx.book.id,
      categoryId,
      name: n,
      slug: createId(),
      sortOrder: (agg?.m ?? -1) + 1,
    });
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function archiveSubcategory(id: string): Promise<ActionResult> {
  try {
    const ctx = await getActiveBook();
    if (!ctx) return { ok: false, error: "Session expired" };
    await db
      .update(subcategories)
      .set({ isArchived: true })
      .where(
        and(eq(subcategories.id, id), eq(subcategories.bookId, ctx.book.id)),
      );
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
