"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  createCategory,
  updateCategory,
  archiveCategory,
  createSubcategory,
  archiveSubcategory,
} from "@/lib/actions/categories";
import { categoryColor } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type { CategoryWithSubs } from "@/lib/queries/categories";

const COLORS = [
  "amber",
  "green",
  "orange",
  "blue",
  "slate",
  "rose",
  "purple",
  "teal",
  "cyan",
  "pink",
  "brown",
];

export function CategoriesManager({
  categories,
}: {
  categories: CategoryWithSubs[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState("amber");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    await createCategory({ name: name.trim(), color });
    setName("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-3xl border border-hairline bg-surface p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="New category"
          maxLength={40}
          className="w-full rounded-xl border border-hairline bg-bg px-3.5 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
        />
        <div className="flex items-center justify-between gap-3">
          <Swatches value={color} onChange={setColor} />
          <button
            onClick={add}
            disabled={busy || !name.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        </div>
      </div>

      {categories.map((c) => (
        <CategoryCard key={c.id} category={c} />
      ))}
    </div>
  );
}

function CategoryCard({ category }: { category: CategoryWithSubs }) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [subName, setSubName] = useState("");

  async function saveName() {
    if (name.trim() && name.trim() !== category.name) {
      await updateCategory(category.id, {
        name: name.trim(),
        color: category.color,
      });
      router.refresh();
    }
  }
  async function changeColor(color: string) {
    await updateCategory(category.id, { name: category.name, color });
    router.refresh();
  }
  async function archive() {
    await archiveCategory(category.id);
    router.refresh();
  }
  async function addSub() {
    if (!subName.trim()) return;
    await createSubcategory(category.id, subName.trim());
    setSubName("");
    router.refresh();
  }
  async function removeSub(id: string) {
    await archiveSubcategory(id);
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-hairline bg-surface p-5">
      <div className="flex items-center gap-2">
        <ColorSelect value={category.color} onChange={changeColor} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.target as HTMLInputElement).blur()
          }
          maxLength={40}
          className="flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium outline-none hover:border-hairline focus:border-muted"
        />
        <button
          onClick={archive}
          className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-over"
          aria-label="Archive category"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {category.subcategories.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 rounded-full border border-hairline bg-bg py-1 pl-3 pr-1 text-sm"
          >
            {s.name}
            <button
              onClick={() => removeSub(s.id)}
              className="grid h-5 w-5 place-items-center rounded-full text-muted hover:text-over"
              aria-label="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          value={subName}
          onChange={(e) => setSubName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSub()}
          onBlur={addSub}
          placeholder="+ subcategory"
          maxLength={40}
          className="w-32 rounded-full border border-dashed border-hairline bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted focus:border-muted"
        />
      </div>
    </div>
  );
}

function Swatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={c}
          aria-pressed={value === c}
          className={cn(
            "h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-surface transition",
            value === c ? "ring-fg" : "ring-transparent hover:ring-hairline",
          )}
          style={{ backgroundColor: categoryColor(c).cssVar }}
        />
      ))}
    </div>
  );
}

function ColorSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-hairline bg-bg py-2 pl-7 pr-6 text-sm outline-none focus:border-muted"
        aria-label="Color"
      >
        {COLORS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: categoryColor(value).cssVar }}
      />
    </div>
  );
}
