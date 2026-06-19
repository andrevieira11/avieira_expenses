import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { Topbar } from "./Topbar";

export function AppShell({
  user,
  pendingCount = 0,
  children,
}: {
  user: { name: string; email: string };
  pendingCount?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[15rem_1fr]">
      <Sidebar pendingCount={pendingCount} />
      <div className="flex min-h-[100dvh] flex-col">
        <Topbar user={user} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
      <TabBar pendingCount={pendingCount} />
    </div>
  );
}
