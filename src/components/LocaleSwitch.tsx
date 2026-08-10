"use client";

import { useTransition } from "react";
import { setLocaleAction } from "@/app/actions";
import type { Locale } from "@/lib/i18n";

export default function LocaleSwitch({ current }: { current: Locale }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex overflow-hidden rounded-md border border-line text-xs font-semibold">
      {(["tr", "en"] as const).map((locale) => (
        <button
          key={locale}
          onClick={() => startTransition(() => setLocaleAction(locale))}
          disabled={isPending || locale === current}
          className={
            locale === current
              ? "bg-accent px-3 py-1.5 text-black"
              : "bg-surface px-3 py-1.5 text-muted hover:text-foreground disabled:opacity-50"
          }
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
