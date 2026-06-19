import { redirect } from "next/navigation";
import { getActiveBook } from "@/lib/queries/active-book";
import { getPendingTransactions } from "@/lib/queries/transactions";
import { getBookCategories } from "@/lib/queries/categories";
import { PendingInbox } from "@/components/inbox/PendingInbox";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const [pending, categories] = await Promise.all([
    getPendingTransactions(ctx.book.id),
    getBookCategories(ctx.book.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="A aguardar categoria"
        subtitle={
          pending.length
            ? `${pending.length} por categorizar`
            : "Tudo categorizado"
        }
      />
      <PendingInbox
        pending={pending}
        categories={categories}
        currency={ctx.book.currency}
      />
    </div>
  );
}
