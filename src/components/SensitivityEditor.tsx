"use client";

import { useState, useTransition } from "react";
import { setSensitivityAction } from "@/app/actions";
import type { SensitivityWeights } from "@/lib/score";
import { SENSITIVITY_LEVELS, type SensitivityLevel } from "@/lib/sensitivity";
import type { ContentCategory } from "@/lib/types";
import { CONTENT_CATEGORIES } from "@/lib/types";

interface Props {
  weights: SensitivityWeights;
  categoryLabels: Record<ContentCategory, string>;
  levelLabels: Record<"off" | "normal" | "sensitive" | "very", string>;
}

const LEVEL_KEYS = ["off", "normal", "sensitive", "very"] as const;

// Kategori başına dörtlü seçim; tıklanınca iyimser güncellenir ve kaydedilir
export default function SensitivityEditor({
  weights,
  categoryLabels,
  levelLabels,
}: Props) {
  const [local, setLocal] = useState<SensitivityWeights>(weights);
  const [, startTransition] = useTransition();

  const pick = (category: ContentCategory, level: SensitivityLevel) => {
    setLocal((w) => ({ ...w, [category]: level }));
    startTransition(() => setSensitivityAction(category, level));
  };

  return (
    <div className="divide-y divide-line rounded-md border border-line bg-surface">
      {CONTENT_CATEGORIES.map((cat) => {
        const current = local[cat] ?? 1;
        return (
          <div
            key={cat}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
          >
            <span className="text-sm">{categoryLabels[cat]}</span>
            <span
              role="radiogroup"
              aria-label={categoryLabels[cat]}
              className="flex overflow-hidden rounded-md border border-line"
            >
              {SENSITIVITY_LEVELS.map((level, i) => {
                const selected = current === level;
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => pick(cat, level)}
                    className={`px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                      selected
                        ? "bg-accent text-black"
                        : "bg-surface-2 text-muted hover:text-foreground"
                    } ${i > 0 ? "border-l border-line" : ""}`}
                  >
                    {levelLabels[LEVEL_KEYS[i]]}
                  </button>
                );
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
