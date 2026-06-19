import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { AcceptInvite } from "@/components/books/AcceptInvite";

export const metadata = { title: "Convite" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getServerSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-bg px-4">
      <AcceptInvite token={token} />
    </main>
  );
}
