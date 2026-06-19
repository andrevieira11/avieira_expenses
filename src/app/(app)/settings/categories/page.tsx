import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import { getBookCategories } from "@/lib/queries/categories";
import { CategoriesManager } from "@/components/categories/CategoriesManager";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const categories = await getBookCategories(ctx.book.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        subtitle="Add, rename or archive categories and subcategories."
      />
      <CategoriesManager categories={categories} />
    </div>
  );
}
