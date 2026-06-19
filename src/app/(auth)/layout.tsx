import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (session) redirect("/");

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      {children}
    </main>
  );
}
