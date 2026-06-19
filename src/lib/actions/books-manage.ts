"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/db/client";
import { books, bookMembers, bookInvites } from "@/db/schema";
import { getServerSession } from "@/lib/auth-session";
import { seedBookCategories } from "@/db/seed/seed-book-categories";
import { ACTIVE_BOOK_COOKIE } from "@/lib/constants";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const COOKIE_OPTS = {
  httpOnly: false,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

async function roleIn(bookId: string, userId: string) {
  const [m] = await db
    .select({ role: bookMembers.role })
    .from(bookMembers)
    .where(and(eq(bookMembers.bookId, bookId), eq(bookMembers.userId, userId)))
    .limit(1);
  return m?.role ?? null;
}

export async function createBook(input: {
  name: string;
  type: "personal" | "shared";
}): Promise<Result<{ id: string }>> {
  try {
    const session = await getServerSession();
    if (!session) return { ok: false, error: "Sessão expirada" };
    const data = z
      .object({
        name: z.string().trim().min(1).max(60),
        type: z.enum(["personal", "shared"]),
      })
      .parse(input);

    const id = createId();
    await db
      .insert(books)
      .values({ id, name: data.name, type: data.type, ownerId: session.user.id });
    await db
      .insert(bookMembers)
      .values({ bookId: id, userId: session.user.id, role: "owner" });
    await seedBookCategories(id);

    (await cookies()).set(ACTIVE_BOOK_COOKIE, id, COOKIE_OPTS);
    revalidatePath("/settings/books");
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function createInvite(
  bookId: string,
  email: string,
): Promise<Result<{ token: string }>> {
  try {
    const session = await getServerSession();
    if (!session) return { ok: false, error: "Sessão expirada" };
    if ((await roleIn(bookId, session.user.id)) !== "owner")
      return { ok: false, error: "Apenas o dono pode convidar" };

    const token = createId() + createId();
    await db.insert(bookInvites).values({
      bookId,
      email: email || "",
      role: "member",
      token,
      invitedBy: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return { ok: true, token };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function acceptInvite(
  token: string,
): Promise<Result<{ bookId: string }>> {
  try {
    const session = await getServerSession();
    if (!session) return { ok: false, error: "Inicia sessão para aceitar" };

    const [inv] = await db
      .select()
      .from(bookInvites)
      .where(and(eq(bookInvites.token, token), eq(bookInvites.status, "pending")))
      .limit(1);
    if (!inv) return { ok: false, error: "Convite inválido ou já usado" };
    if (new Date(inv.expiresAt) < new Date())
      return { ok: false, error: "Convite expirado" };

    await db
      .insert(bookMembers)
      .values({ bookId: inv.bookId, userId: session.user.id, role: inv.role })
      .onConflictDoNothing();
    await db
      .update(bookInvites)
      .set({ status: "accepted" })
      .where(eq(bookInvites.id, inv.id));

    (await cookies()).set(ACTIVE_BOOK_COOKIE, inv.bookId, COOKIE_OPTS);
    revalidatePath("/", "layout");
    return { ok: true, bookId: inv.bookId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function leaveBook(bookId: string): Promise<Result> {
  try {
    const session = await getServerSession();
    if (!session) return { ok: false, error: "Sessão expirada" };
    const [b] = await db
      .select({ ownerId: books.ownerId })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);
    if (b?.ownerId === session.user.id)
      return { ok: false, error: "O dono não pode sair do livro" };

    await db
      .delete(bookMembers)
      .where(
        and(
          eq(bookMembers.bookId, bookId),
          eq(bookMembers.userId, session.user.id),
        ),
      );
    revalidatePath("/settings/books");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export async function removeMember(
  bookId: string,
  userId: string,
): Promise<Result> {
  try {
    const session = await getServerSession();
    if (!session) return { ok: false, error: "Sessão expirada" };
    if ((await roleIn(bookId, session.user.id)) !== "owner")
      return { ok: false, error: "Apenas o dono pode remover" };
    const [b] = await db
      .select({ ownerId: books.ownerId })
      .from(books)
      .where(eq(books.id, bookId))
      .limit(1);
    if (b?.ownerId === userId)
      return { ok: false, error: "Não podes remover o dono" };

    await db
      .delete(bookMembers)
      .where(and(eq(bookMembers.bookId, bookId), eq(bookMembers.userId, userId)));
    revalidatePath("/settings/books");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}
