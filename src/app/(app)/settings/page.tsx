import { redirect } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { getActiveBook } from "@/lib/queries/active-book";
import { PushToggle } from "@/components/settings/PushToggle";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Definições" };

export default async function SettingsPage() {
  const ctx = await getActiveBook();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-5">
      <PageHeader title="Definições" />

      <Section title="Personalização" desc="Gere as tuas categorias e livros.">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/settings/categories"
            className="rounded-xl border border-hairline px-3.5 py-2 text-sm font-medium transition hover:bg-surface-2"
          >
            Categorias
          </Link>
          <Link
            href="/settings/books"
            className="rounded-xl border border-hairline px-3.5 py-2 text-sm font-medium transition hover:bg-surface-2"
          >
            Livros
          </Link>
        </div>
      </Section>

      <Section
        title="Notificações"
        desc="Alertas quando passas o orçamento e lembretes de renovações."
      >
        <PushToggle />
      </Section>

      <Section title="Dados" desc="Exporta todos os teus movimentos.">
        <a
          href="/api/export"
          className="inline-flex items-center gap-2 rounded-xl border border-hairline px-3.5 py-2 text-sm font-medium transition hover:bg-surface-2"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </a>
      </Section>

      <Section title="Livro ativo">
        <p className="text-sm text-muted">
          {ctx.book.name} · {ctx.book.currency}
        </p>
      </Section>

      <Section title="Conta">
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
