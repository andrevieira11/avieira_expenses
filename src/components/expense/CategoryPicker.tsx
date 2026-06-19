"use client";

import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { categoryColor } from "@/lib/colors";
import type { CategoryWithSubs } from "@/lib/queries/categories";
import { cn } from "@/lib/utils";

export type CategorySelection = {
  categoryId: string | null;
  subcategoryId: string | null;
};

export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: CategoryWithSubs[];
  value: CategorySelection;
  onChange: (v: CategorySelection) => void;
}) {
  const selected = categories.find((c) => c.id === value.categoryId) ?? null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!selected ? (
        <motion.div
          key="categories"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.18 }}
          className="grid grid-cols-2 gap-2"
        >
          {categories.map((c) => {
            const color = categoryColor(c.color);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange({ categoryId: c.id, subcategoryId: null })}
                className="flex items-center gap-2.5 rounded-2xl border border-hairline px-3.5 py-3 text-left text-sm font-medium transition hover:brightness-95"
                style={{ backgroundColor: color.softVar }}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: color.cssVar }}
                />
                <span className="truncate text-fg">{c.name}</span>
              </button>
            );
          })}
        </motion.div>
      ) : (
        <motion.div
          key="subcategories"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.18 }}
        >
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ categoryId: null, subcategoryId: null })}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface-2"
              aria-label="Voltar às categorias"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: categoryColor(selected.color).cssVar }}
            />
            <span className="text-sm font-medium">{selected.name}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {selected.subcategories.map((s) => {
              const active = value.subcategoryId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    onChange({ categoryId: selected.id, subcategoryId: s.id })
                  }
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition",
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-hairline bg-surface hover:bg-surface-2",
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
