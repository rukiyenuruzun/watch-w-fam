"use client";

import { useState, useTransition } from "react";
import { deleteCommentAction, updateCommentAction } from "@/app/actions";
import type { RiskVote } from "@/lib/types";

// CommentsSection'daki özet barlarıyla aynı renkler (server bileşeninden
// import edilemez, çünkü o modül fs kullanan comments kitaplığına bağlı)
const VOTE_COLORS: Record<RiskVote, string> = {
  lower: "#0ca30c",
  correct: "#9ab",
  higher: "#d03b3b",
};

export interface CommentItemLabels {
  anonymous: string;
  edit: string;
  delete: string;
  deleteConfirm: string;
  deleteYes: string;
  cancel: string;
  save: string;
  edited: string;
  nameLabel: string;
  likedLabel: string;
  likedYes: string;
  likedNo: string;
  voteLabel: string;
  textLabel: string;
  voteLabels: Record<RiskVote, string>;
}

interface Props {
  id: string;
  tmdbId: number;
  name: string;
  text: string;
  liked: boolean | null;
  riskVote: RiskVote | null;
  dateLabel: string; // sunucuda biçimlenir (saat dilimi uyumsuzluğu olmasın)
  isEdited: boolean;
  isOwner: boolean;
  hasAnalysis: boolean;
  t: CommentItemLabels;
}

const inputCls =
  "w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent";

export default function CommentItem({
  id,
  tmdbId,
  name,
  text,
  liked,
  riskVote,
  dateLabel,
  isEdited,
  isOwner,
  hasAnalysis,
  t,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("tmdbId", String(tmdbId));
      await deleteCommentAction(fd);
    });
  };

  const handleUpdate = (fd: FormData) => {
    startTransition(async () => {
      await updateCommentAction(fd);
      setEditing(false);
    });
  };

  return (
    <li className="rounded-md border border-line bg-surface p-4">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold">{name || t.anonymous}</span>
        <span className="text-muted">{dateLabel}</span>
        {isEdited && <span className="italic text-muted">({t.edited})</span>}
        {liked !== null && <span>{liked ? "👍" : "👎"}</span>}
        {riskVote && (
          <span
            className="rounded px-2 py-0.5 text-[11px] font-medium"
            style={{
              color: VOTE_COLORS[riskVote],
              backgroundColor: `${VOTE_COLORS[riskVote]}1a`,
            }}
          >
            {t.voteLabels[riskVote]}
          </span>
        )}
        {isOwner && !editing && (
          <span className="ml-auto flex items-center gap-2.5">
            {confirming ? (
              <>
                <span className="text-muted">{t.deleteConfirm}</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="font-semibold text-[#d03b3b] hover:underline disabled:opacity-50"
                >
                  {t.deleteYes}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-muted hover:underline"
                >
                  {t.cancel}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-muted transition-colors hover:text-accent"
                >
                  {t.edit}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="text-muted transition-colors hover:text-[#d03b3b]"
                >
                  {t.delete}
                </button>
              </>
            )}
          </span>
        )}
      </div>

      {editing ? (
        <form action={handleUpdate} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="tmdbId" value={tmdbId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted">{t.nameLabel}</span>
              <input type="text" name="name" defaultValue={name} maxLength={40} className={inputCls} />
            </label>
            <fieldset>
              <legend className="mb-1 text-xs text-muted">{t.likedLabel}</legend>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="liked"
                    value="yes"
                    defaultChecked={liked === true}
                    className="accent-(--accent)"
                  />
                  {t.likedYes}
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="liked"
                    value="no"
                    defaultChecked={liked === false}
                    className="accent-(--accent)"
                  />
                  {t.likedNo}
                </label>
                <label className="flex items-center gap-1.5 text-muted">
                  <input
                    type="radio"
                    name="liked"
                    value=""
                    defaultChecked={liked === null}
                    className="accent-(--accent)"
                  />
                  —
                </label>
              </div>
            </fieldset>
          </div>

          {hasAnalysis && (
            <fieldset>
              <legend className="mb-1 text-xs text-muted">{t.voteLabel}</legend>
              <div className="flex flex-wrap gap-3 text-sm">
                {(["lower", "correct", "higher"] as const).map((vote) => (
                  <label key={vote} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="riskVote"
                      value={vote}
                      defaultChecked={riskVote === vote}
                      className="accent-(--accent)"
                    />
                    {t.voteLabels[vote]}
                  </label>
                ))}
                <label className="flex items-center gap-1.5 text-muted">
                  <input
                    type="radio"
                    name="riskVote"
                    value=""
                    defaultChecked={riskVote === null}
                    className="accent-(--accent)"
                  />
                  —
                </label>
              </div>
            </fieldset>
          )}

          <label className="block">
            <span className="mb-1 block text-xs text-muted">{t.textLabel}</span>
            <textarea name="text" rows={3} maxLength={1000} defaultValue={text} className={inputCls} />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-black transition hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {t.save}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-line px-4 py-1.5 text-sm transition hover:border-accent hover:text-accent"
            >
              {t.cancel}
            </button>
          </div>
        </form>
      ) : (
        text && <p className="text-sm leading-relaxed">{text}</p>
      )}
    </li>
  );
}
