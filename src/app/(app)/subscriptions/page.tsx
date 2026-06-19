import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import { getRecurring } from "@/lib/queries/recurring";
import { getBookCategories } from "@/lib/queries/categories";
import { SubscriptionsManager } from "@/components/subscriptions/SubscriptionsManager";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const [recurring, categories] = await Promise.all([
    getRecurring(ctx.book.id),
    getBookCategories(ctx.book.id),
  ]);

  const cats = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        subtitle="Recurring expenses and renewals."
      />
      <SubscriptionsManager
        recurring={recurring}
        categories={cats}
        currency={ctx.book.currency}
      />
    </div>
  );
}
