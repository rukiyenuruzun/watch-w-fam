"use client";

import { useState } from "react";
import LocaleSwitch from "./LocaleSwitch";
import ThemeSwitch from "./ThemeSwitch";
import type { Locale } from "@/lib/i18n";
import type { Theme } from "@/lib/theme";

// Başlıktaki ⚙️ menüsü: dil ve görünüm (tema) seçimi
export default function SettingsMenu({
  current,
  title,
  languageLabel,
  theme,
  themeLabel,
  themeNames,
}: {
  current: Locale;
  title: string;
  languageLabel: string;
  theme: Theme;
  themeLabel: string;
  themeNames: Record<Theme, string>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={title}
        title={title}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm transition ${
          open
            ? "border-accent bg-surface"
            : "border-transparent text-muted hover:border-line hover:bg-surface/60 hover:text-foreground"
        }`}
      >
        <span aria-hidden>⚙️</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 space-y-3 rounded-md border border-line bg-surface p-3 shadow-xl shadow-black/40">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {languageLabel}
            </p>
            <LocaleSwitch current={current} />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {themeLabel}
            </p>
            <ThemeSwitch current={theme} labels={themeNames} />
          </div>
        </div>
      )}
    </div>
  );
}
