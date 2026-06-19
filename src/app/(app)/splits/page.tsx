import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import { getSplits } from "@/lib/queries/splits";
import { getBookCategories } from "@/lib/queries/categories";
import { SplitsManager } from "@/components/splits/SplitsManager";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Acertos" };

export default async function SplitsPage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const [splits, categories] = await Promise.all([
    getSplits(ctx.book.id),
    getBookCategories(ctx.book.id),
  ]);
  const cats = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acertos"
        subtitle="Divide despesas; quem paga entra como receita na categoria escolhida."
      />
      <SplitsManager splits={splits} categories={cats} currency={ctx.book.currency} />
    </div>
  );
}
