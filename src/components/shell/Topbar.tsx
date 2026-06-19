import { BookSwitcher } from "./BookSwitcher";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Topbar({ user }: { user: { name: string; email: string } }) {
  return (
    <header className="pt-safe sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-hairline bg-bg/80 px-4 py-3 backdrop-blur-md md:px-8">
      <BookSwitcher />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
