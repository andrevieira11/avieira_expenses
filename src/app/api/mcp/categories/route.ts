import { NextRequest, NextResponse } from "next/server";
import { apiTokenOk, resolveDefaultBook } from "@/lib/mcp-api";
import { getBookCategories } from "@/lib/queries/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!apiTokenOk(req))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const book = await resolveDefaultBook();
  if (!book) return NextResponse.json({ error: "no_book" }, { status: 409 });

  const cats = await getBookCategories(book.id);
  return NextResponse.json(
    cats.map((c) => ({
      name: c.name,
      slug: c.slug,
      subcategories: c.subcategories.map((s) => s.name),
    })),
  );
}
