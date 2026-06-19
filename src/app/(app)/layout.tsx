import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServerSession } from "@/lib/auth-session";
import { getUserBooks, createPersonalBook } from "@/lib/queries/books";
import { getPendingCount } from "@/lib/queries/transactions";
import { ACTIVE_BOOK_COOKIE } from "@/lib/constants";
import { BookProvider } from "@/lib/book-context";
import { AppShell } from "@/components/shell/AppShell";
import { SyncOnOpen } from "@/components/banking/SyncOnOpen";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const userId = session.user.id;
  let books = await getUserBooks(userId);
  if (books.length === 0) {
    // Safety net if the signup hook didn't run.
    await createPersonalBook(userId);
    books = await getUserBooks(userId);
  }

  const store = await cookies();
  const preferred = store.get(ACTIVE_BOOK_COOKIE)?.value;
  const activeBookId = books.find((b) => b.id === preferred)?.id ?? books[0].id;
  const pendingCount = await getPendingCount(activeBookId);

  return (
    <BookProvider books={books} activeBookId={activeBookId}>
      <SyncOnOpen />
      <AppShell
        user={{ name: session.user.name, email: session.user.email }}
        pendingCount={pendingCount}
      >
        {children}
      </AppShell>
    </BookProvider>
  );
}
