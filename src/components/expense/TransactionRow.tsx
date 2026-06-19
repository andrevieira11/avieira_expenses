import { categoryColor } from "@/lib/colors";
import { formatFlow } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { MonthTransaction } from "@/lib/queries/transactions";

export function TransactionRow({
  tx,
  onClick,
}: {
  tx: MonthTransaction;
  onClick?: () => void;
}) {
  const color = categoryColor(tx.categoryColor);
  const isCredit = (tx.amountCents ?? 0) < 0;
  const title = tx.merchant || tx.subcategoryName || tx.categoryName || "Sem categoria";
  const subtitle = [tx.categoryName, tx.subcategoryName, tx.note]
    .filter(Boolean)
    .join(" · ");

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 py-2.5 text-left",
        onClick && "transition hover:opacity-80",
      )}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: color.softVar }}
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color.cssVar }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      <span
        className={cn(
          "shrink-0 font-mono text-sm tabular-nums",
          isCredit ? "text-good" : "text-fg",
        )}
      >
        {formatFlow(tx.amountCents)}
      </span>
    </Wrapper>
  );
}
