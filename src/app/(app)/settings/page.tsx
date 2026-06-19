import { redirect } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { getActiveBook } from "@/lib/queries/active-book";
import { getBankConnections } from "@/lib/queries/banking";
import { PushToggle } from "@/components/settings/PushToggle";
import { BankConnect } from "@/components/settings/BankConnect";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  const bankConnections = await getBankConnections(ctx.book.id);

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" />

      <Section title="Personalization" desc="Manage your categories and books.">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings/categories"
            className="rounded-xl border border-hairline px-3.5 py-2 text-sm font-medium transition hover:bg-surface-2"
          >
            Categories
          </Link>
          <Link
            href="/settings/books"
            className="rounded-xl border border-hairline px-3.5 py-2 text-sm font-medium transition hover:bg-surface-2"
          >
            Books
          </Link>
        </div>
      </Section>

      <Section
        title="Bank"
        desc="Auto-import your moey! / Crédito Agrícola transactions into the inbox."
      >
        <BankConnect connections={bankConnections} />
      </Section>

      <Section
        title="Notifications"
        desc="Alerts when you go over budget and renewal reminders."
      >
        <PushToggle />
      </Section>

      <Section title="Data" desc="Export all your transactions.">
        <a
          href="/api/export"
          className="inline-flex items-center gap-2 rounded-xl border border-hairline px-3.5 py-2 text-sm font-medium transition hover:bg-surface-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </Section>

      <Section title="Active book">
        <p className="text-sm text-muted">
          {ctx.book.name} · {ctx.book.currency}
        </p>
      </Section>

      <Section title="Account">
        <p className="text-sm text-muted">{ctx.user.email}</p>
      </Section>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-hairline bg-surface p-5">
      <h2 className="font-medium">{title}</h2>
      {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
