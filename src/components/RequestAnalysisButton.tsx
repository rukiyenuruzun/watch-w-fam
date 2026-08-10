"use client";

import { useTransition } from "react";
import { requestAnalysisAction } from "@/app/actions";

interface Props {
  tmdbId: number;
  label: string;
  pendingLabel: string;
  small?: boolean; // durum sayfasındaki kuyruk satırları için ufak boy
}

export default function RequestAnalysisButton({
  tmdbId,
  label,
  pendingLabel,
  small = false,
}: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => requestAnalysisAction(tmdbId))}
      disabled={isPending}
      className={
        small
          ? "rounded bg-accent px-2.5 py-1 text-xs font-semibold text-black transition hover:opacity-90 active:scale-95 disabled:opacity-50"
          : "rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 active:scale-95 disabled:opacity-50"
      }
    >
      {isPending ? pendingLabel : label}
    </button>
  );
}
