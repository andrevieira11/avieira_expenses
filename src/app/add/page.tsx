import Link from "next/link";
import { redirect } from "next/navigation";
import { X } from "lucide-react";
import { getActiveBook } from "@/lib/queries/active-book";
import { getBookCategories } from "@/lib/queries/categories";
import { AddExpenseForm } from "@/components/expense/AddExpenseForm";

export const metadata = { title: "Add" };

// Full-screen focused entry (no bottom tab bar) so the Save bar is always reachable.
export default async function AddPage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const categories = await getBookCategories(ctx.book.id);

  return (
    <main className="min-h-[100dvh] bg-bg">
      <header className="pt-safe sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-bg/90 px-4 py-3 backdrop-blur-md">
        <span className="text-base font-semibold">New expense</span>
        <Link
          href="/"
          aria-label="Close"
          className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2"
        >
          <X className="h-5 w-5" />
        </Link>
      </header>
      <div className="px-4 py-4">
        <AddExpenseForm categories={categories} currency={ctx.book.currency} />
      </div>
    </main>
  );
}
