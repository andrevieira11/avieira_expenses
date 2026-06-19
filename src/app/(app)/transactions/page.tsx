import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { getActiveBook } from "@/lib/queries/active-book";
import {
  getRecentTransactions,
  searchTransactions,
} from "@/lib/queries/transactions";
import { getBookCategories } from "@/lib/queries/categories";
import { EditableTransactionList } from "@/components/expense/EditableTransactionList";
import { SearchBar } from "@/components/transactions/SearchBar";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Transactions" };

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const q = (await searchParams).q?.trim() ?? "";

  const [transactions, categories] = await Promise.all([
    q
      ? searchTransactions(ctx.book.id, q, 200)
      : getRecentTransactions(ctx.book.id, 200),
    getBookCategories(ctx.book.id),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        subtitle="Tap to edit or delete."
        action={
          <a
            href="/api/export"
            className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-1.5 text-sm font-medium transition hover:bg-surface-2"
          >
            <Download className="h-4 w-4" />
            CSV
          </a>
        }
      />
      <SearchBar initial={q} />
      <EditableTransactionList
        transactions={transactions}
        categories={categories}
        currency={ctx.book.currency}
        emptyHint={q ? "No results for that search." : undefined}
      />
    </div>
  );
}
