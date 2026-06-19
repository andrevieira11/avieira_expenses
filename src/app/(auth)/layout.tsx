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
    <main className="flex min-h-[100dvh] items-center justify-center bg-bg px-4">
      {children}
    </main>
  );
}
