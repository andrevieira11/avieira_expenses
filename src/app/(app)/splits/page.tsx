import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import { getSplits } from "@/lib/queries/splits";
import { SplitsManager } from "@/components/splits/SplitsManager";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Acertos" };

export default async function SplitsPage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const splits = await getSplits(ctx.book.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acertos"
        subtitle="Divide despesas; quem paga entra como receita."
      />
      <SplitsManager splits={splits} currency={ctx.book.currency} />
    </div>
  );
}
