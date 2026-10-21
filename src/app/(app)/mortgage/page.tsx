import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import { todayYmd } from "@/lib/dates";
import { MortgageSimulator } from "@/components/mortgage/MortgageSimulator";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Mortgage" };

export default async function MortgagePage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="House mortgage"
        subtitle="BPI · progress and what paying extra would do."
      />
      <MortgageSimulator today={todayYmd()} />
    </div>
  );
}
