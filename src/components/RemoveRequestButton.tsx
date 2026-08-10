"use client";

import { useTransition } from "react";
import { removeRequestAction } from "@/app/actions";

interface Props {
  tmdbId: number;
  label: string;
  pendingLabel: string;
}

// Durum sayfası kuyruğunda "altyazı bulunamadı" satırlarını listeden kaldırır
export default function RemoveRequestButton({
  tmdbId,
  label,
  pendingLabel,
}: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => removeRequestAction(tmdbId))}
      disabled={isPending}
      className="rounded border border-line px-2.5 py-1 text-xs font-semibold text-muted transition hover:border-red-400/60 hover:text-red-400 active:scale-95 disabled:opacity-50"
    >
      ✕ {isPending ? pendingLabel : label}
    </button>
  );
}
