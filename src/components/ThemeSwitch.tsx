"use client";

import { useTransition } from "react";
import { setThemeAction } from "@/app/actions";
import { THEMES, type Theme } from "@/lib/theme";

export default function ThemeSwitch({
  current,
  labels,
}: {
  current: Theme;
  labels: Record<Theme, string>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex overflow-hidden rounded-md border border-line text-xs font-semibold">
      {THEMES.map((theme) => (
        <button
          key={theme}
          onClick={() => startTransition(() => setThemeAction(theme))}
          disabled={isPending || theme === current}
          className={
            theme === current
              ? "bg-accent px-3 py-1.5 text-black"
              : // Pink seçili değilken bile pembe göz kırpar
                `bg-surface px-3 py-1.5 hover:text-foreground disabled:opacity-50 ${
                  theme === "pink" ? "text-pink-400" : "text-muted"
                }`
          }
        >
          {labels[theme]}
        </button>
      ))}
    </div>
  );
}
