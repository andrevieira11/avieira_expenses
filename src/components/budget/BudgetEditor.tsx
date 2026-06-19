"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { setBudget } from "@/lib/actions/budgets";
import { categoryColor } from "@/lib/colors";
import { centsToInput, euroInputToCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type Cat = {
  id: string;
  name: string;
  color: string;
  budgetCents: number | null;
};

export function BudgetEditor({
  monthStart,
  overallCents,
  categories,
}: {
  monthStart: string;
  overallCents: number | null;
  categories: Cat[];
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-hairline bg-surface px-2">
        <BudgetRow
          label="Total budget"
          scope="overall"
          categoryId={null}
          monthStart={monthStart}
          initialCents={overallCents}
          bold
        />
      </div>

      <div>
        <h2 className="mb-2 px-1 text-sm font-medium text-muted">
          Per category (optional)
        </h2>
        <div className="divide-y divide-hairline rounded-3xl border border-hairline bg-surface px-2">
          {categories.map((c) => (
            <BudgetRow
              key={c.id}
              label={c.name}
              color={c.color}
              scope="category"
              categoryId={c.id}
              monthStart={monthStart}
              initialCents={c.budgetCents}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BudgetRow({
  label,
  color,
  scope,
  categoryId,
  monthStart,
  initialCents,
  bold,
}: {
  label: string;
  color?: string;
  scope: "overall" | "category";
  categoryId: string | null;
  monthStart: string;
  initialCents: number | null;
  bold?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(centsToInput(initialCents));
  const [saved, setSaved] = useState(centsToInput(initialCents));
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">(
    "idle",
  );

  async function commit() {
    if (value === saved) return;
    const cents = euroInputToCents(value);
    if (cents == null) {
      setValue(saved);
      setState("idle");
      return;
    }
    setState("saving");
    const res = await setBudget({
      scope,
      categoryId,
      amountCents: cents,
      effectiveFrom: monthStart,
    });
    if (res.ok) {
      setSaved(value);
      setState("done");
      router.refresh();
    } else {
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-3 px-2 py-3">
      {color && (
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: categoryColor(color).cssVar }}
        />
      )}
      <span className={cn("flex-1 text-sm", bold && "font-medium")}>{label}</span>
      {state === "saving" && (
        <Loader2 className="h-4 w-4 animate-spin text-muted" />
      )}
      {state === "done" && <Check className="h-4 w-4 text-good" />}
      <div className="flex items-center gap-1">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setState("idle");
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="—"
          className={cn(
            "w-24 rounded-xl border bg-bg px-3 py-1.5 text-right font-mono text-sm tabular-nums outline-none focus:border-muted",
            state === "error" ? "border-over" : "border-hairline",
          )}
        />
        <span className="text-sm text-muted">€</span>
      </div>
    </div>
  );
}
