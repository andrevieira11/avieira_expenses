import type { LucideIcon } from "lucide-react";

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-muted">
        <Icon className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">{title}</h1>
      <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>
      <span className="mt-4 rounded-full border border-hairline px-3 py-1 text-xs text-muted">
        Em breve
      </span>
    </div>
  );
}
