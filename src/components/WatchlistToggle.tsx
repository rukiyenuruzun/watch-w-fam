"use client";

import { useTransition } from "react";
import { toggleWatchlistAction } from "@/app/actions";

interface Props {
  tmdbId: number;
  inList: boolean;
  addLabel: string;
  removeLabel: string;
  inListLabel: string;
  // "icon": kart posterinin köşesindeki yer imi; "button": film sayfası butonu
  variant?: "icon" | "button";
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
    >
      <path d="M6 3.5h12a.5.5 0 0 1 .5.5v16.6L12 16.7l-6.5 3.9V4a.5.5 0 0 1 .5-.5z" />
    </svg>
  );
}

export default function WatchlistToggle({
  tmdbId,
  inList,
  addLabel,
  removeLabel,
  inListLabel,
  variant = "icon",
}: Props) {
  const [isPending, startTransition] = useTransition();

  const toggle = (e: React.MouseEvent) => {
    // Kart üzerindeyken karta tıklanmış sayılmasın (Link'in içinde)
    e.preventDefault();
    e.stopPropagation();
    startTransition(() => toggleWatchlistAction(tmdbId));
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        title={inList ? removeLabel : addLabel}
        className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-50 ${
          inList
            ? "border-accent/60 bg-accent/15 text-accent hover:bg-accent/25"
            : "border-line bg-surface hover:border-accent hover:text-accent"
        }`}
      >
        <BookmarkIcon filled={inList} />
        {inList ? inListLabel : addLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      title={inList ? removeLabel : addLabel}
      aria-label={inList ? removeLabel : addLabel}
      className={`absolute left-1.5 top-1.5 z-10 rounded-full bg-black/70 p-1.5 transition hover:scale-110 active:scale-95 disabled:opacity-50 ${
        inList ? "text-accent" : "text-white/80 hover:text-white"
      }`}
    >
      <BookmarkIcon filled={inList} />
    </button>
  );
}
