import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import {
  getUserBooksDetailed,
  getMembersForBooks,
} from "@/lib/queries/books-manage";
import { BooksManager } from "@/components/books/BooksManager";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Livros" };

export default async function BooksPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const books = await getUserBooksDetailed(session.user.id);
  const members = await getMembersForBooks(books.map((b) => b.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Livros"
        subtitle="Cria, partilha e gere os teus livros (pessoal + conjunto)."
      />
      <BooksManager books={books} members={members} />
    </div>
  );
}
