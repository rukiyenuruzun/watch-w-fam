"use client";

import { useState, useTransition } from "react";
import { deleteSceneAction, voteSceneAction } from "@/app/actions";

interface Labels {
  voteUp: string;
  voteDown: string;
  delete: string;
  deleteConfirm: string;
  deleteYes: string;
  cancel: string;
}

interface Props {
  id: string;
  up: number;
  down: number;
  myVote: -1 | 0 | 1;
  mine: boolean;
  t: Labels;
}

// Topluluk sahnesinin oy düğmeleri + (sahibiyse) iki adımlı silme
export default function SceneCommunityControls({
  id,
  up,
  down,
  myVote,
  mine,
  t,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const vote = (value: 1 | -1) =>
    startTransition(() => voteSceneAction(id, value));

  const remove = () =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await deleteSceneAction(fd);
    });

  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
      active
        ? "border-accent bg-accent/15 text-accent"
        : "border-line text-muted hover:border-accent/50 hover:text-foreground"
    }`;

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => vote(1)}
        title={t.voteUp}
        className={chip(myVote === 1)}
      >
        👍 {up}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => vote(-1)}
        title={t.voteDown}
        className={chip(myVote === -1)}
      >
        👎 {down}
      </button>
      {mine &&
        (confirming ? (
          <span className="flex items-center gap-1.5 text-xs">
            <span className="text-muted">{t.deleteConfirm}</span>
            <button
              type="button"
              disabled={isPending}
              onClick={remove}
              className="font-semibold text-red-400 underline disabled:opacity-50"
            >
              {t.deleteYes}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-muted underline"
            >
              {t.cancel}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-xs text-muted underline transition-colors hover:text-red-400"
          >
            {t.delete}
          </button>
        ))}
    </span>
  );
}
