"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Option {
  value: string;
  label: string;
}

interface FilterField {
  name: string;
  label: string;
  value: string;
  options: Option[]; // "Tümü" seçeneği page tarafında eklenir
}

interface Props {
  query: string;
  searchPlaceholder: string;
  searchButton: string;
  recentLabel: string;
  removeRecentLabel: string;
  clearLabel: string;
  fields: FilterField[];
  hasActive: boolean;
}

// Son aramalar tarayıcıda tutulur (hesap gerekmez, sunucuya gitmez)
const RECENT_KEY = "recent-searches";
const MAX_RECENT = 8;

function readRecent(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

// Tek form: arama kutusu + tüm filtre seçimleri aynı sorguyla gider.
// Seçim değişince kendiliğinden gönderilir; gidilen adres #katalog çapasını
// içerir ki sonuç ekranda hero'da değil film listesinde açılsın.
export default function FilterBar({
  query,
  searchPlaceholder,
  searchButton,
  recentLabel,
  removeRecentLabel,
  clearLabel,
  fields,
  hasActive,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // SSR'da boş başlar (liste yalnızca panel açılınca render edildiği için
  // sunucu/istemci farkı HTML'e yansımaz)
  const [recent, setRecent] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : readRecent()
  );
  const [open, setOpen] = useState(false);

  const saveRecent = (list: string[]) => {
    setRecent(list);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {
      // localStorage kapalıysa geçmiş tutulmaz, arama yine çalışır
    }
  };

  const submit = () => {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value === "string" && value) params.set(key, value);
    }
    const q = params.get("q")?.trim();
    if (q) saveRecent([q, ...recent.filter((r) => r !== q)].slice(0, MAX_RECENT));
    const qs = params.toString();
    router.push(qs ? `/?${qs}#katalog` : "/#katalog");
  };

  const pickRecent = (q: string) => {
    if (inputRef.current) inputRef.current.value = q;
    setOpen(false);
    submit();
  };

  const removeRecent = (q: string) => {
    saveRecent(recent.filter((r) => r !== q));
  };

  return (
    <form
      ref={formRef}
      action="/#katalog"
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(false);
        submit();
      }}
      className="space-y-3 rounded-md border border-line bg-surface p-4"
    >
      <div className="flex gap-2">
        {/* Sarmalayıcıdaki blur kontrolü: odak panel içindeki bir düğmeye
            geçiyorsa panel açık kalır, dışarı çıkınca kapanır */}
        <div
          className="relative flex-1"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <input
            ref={inputRef}
            type="search"
            name="q"
            defaultValue={query}
            placeholder={searchPlaceholder}
            // Tarayıcının kendi öneri listesi bizim panelle çakışmasın
            autoComplete="off"
            onFocus={() => setOpen(true)}
            className="w-full rounded-md border border-line bg-surface-2 px-4 py-2.5 text-sm outline-none transition-shadow placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          {open && recent.length > 0 && (
            <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-line bg-surface shadow-xl shadow-black/40">
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {recentLabel}
              </p>
              <ul className="pb-1">
                {recent.map((q) => (
                  <li key={q} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => pickRecent(q)}
                      className="min-w-0 flex-1 truncate px-3 py-1.5 text-left text-sm transition-colors hover:text-accent"
                    >
                      <span aria-hidden className="mr-2 text-muted">
                        🕘
                      </span>
                      {q}
                    </button>
                    <button
                      type="button"
                      aria-label={`${removeRecentLabel}: ${q}`}
                      title={removeRecentLabel}
                      onClick={() => removeRecent(q)}
                      className="shrink-0 px-3 py-1.5 text-sm text-muted transition-colors hover:text-red-400"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <button
          type="submit"
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 active:scale-95"
        >
          {searchButton}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              {field.label}
            </span>
            <select
              name={field.name}
              defaultValue={field.value}
              onChange={submit}
              className="w-full cursor-pointer rounded-md border border-line bg-surface-2 px-2 py-2 text-xs outline-none transition-colors hover:border-accent/50 focus:border-accent"
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {hasActive && (
        <div className="text-right">
          <Link
            href="/#katalog"
            className="text-xs text-muted underline hover:text-accent"
          >
            {clearLabel}
          </Link>
        </div>
      )}
    </form>
  );
}
