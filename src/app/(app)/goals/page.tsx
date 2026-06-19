import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import { getGoals } from "@/lib/queries/goals";
import { GoalsManager } from "@/components/goals/GoalsManager";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const goals = await getGoals(ctx.book.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings goals"
        subtitle="Set targets and track your progress."
      />
      <GoalsManager goals={goals} currency={ctx.book.currency} />
    </div>
  );
}
