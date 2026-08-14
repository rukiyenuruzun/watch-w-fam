"use client";

import { useTransition } from "react";
import { acceptFriendAction, removeFriendAction } from "@/app/actions";
import type { FriendStatus } from "@/lib/friends";

interface Props {
  otherId: string;
  status: FriendStatus;
  labels: {
    friends: string;
    remove: string;
    outgoing: string;
    cancel: string;
    accept: string;
    reject: string;
  };
}

// Kişi sayfasındaki arkadaşlık düğmesi. İstek göndermek davet linkiyle
// olduğu için burada yalnızca kabul/reddet/çıkar eylemleri var.
export default function FriendButton({ otherId, status, labels }: Props) {
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<void>) => () => startTransition(() => void fn());

  const base =
    "rounded-md border px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-50";

  if (status === "friends") {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
          ✓ {labels.friends}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={run(async () => {
            await removeFriendAction(otherId);
          })}
          className={`${base} border-line bg-surface text-muted hover:border-red-500/50 hover:text-red-300`}
        >
          {labels.remove}
        </button>
      </div>
    );
  }

  if (status === "incoming") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={run(async () => {
            await acceptFriendAction(otherId);
          })}
          className={`${base} border-transparent bg-accent text-black hover:opacity-90`}
        >
          {labels.accept}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={run(async () => {
            await removeFriendAction(otherId);
          })}
          className={`${base} border-line bg-surface text-muted hover:border-accent hover:text-accent`}
        >
          {labels.reject}
        </button>
      </div>
    );
  }

  if (status === "outgoing") {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-line bg-surface px-4 py-2 text-sm text-muted">
          ⏳ {labels.outgoing}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={run(async () => {
            await removeFriendAction(otherId);
          })}
          className={`${base} border-line bg-surface text-muted hover:border-accent hover:text-accent`}
        >
          {labels.cancel}
        </button>
      </div>
    );
  }

  return null;
}
