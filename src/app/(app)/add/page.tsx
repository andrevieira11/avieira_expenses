import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import { getBookCategories } from "@/lib/queries/categories";
import { AddExpenseForm } from "@/components/expense/AddExpenseForm";

export const metadata = { title: "Adicionar" };

export default async function AddPage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const categories = await getBookCategories(ctx.book.id);

  return (
    <div>
      <h1 className="mb-2 text-center text-lg font-semibold">Nova despesa</h1>
      <AddExpenseForm categories={categories} currency={ctx.book.currency} />
    </div>
  );
}
