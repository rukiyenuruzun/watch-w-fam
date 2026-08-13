"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { updateProfileAction } from "@/app/actions";

const MAX_BYTES = 2 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Hesap kartındaki düzenlenebilir kısım: avatar (📷 ile değiştirilir) ve
// görünen ad (✏️ ile satır içi düzenlenir). E-posta/üyelik bilgisi gibi
// salt-okunur satırlar children olarak sunucudan gelir.
export default function ProfileEditor({
  name,
  avatarUrl,
  initial,
  labels,
  children,
}: {
  name: string;
  avatarUrl?: string;
  initial: string;
  labels: {
    editName: string;
    changePhoto: string;
    photoTooBig: string;
    save: string;
    cancel: string;
  };
  children?: ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (fd: FormData) =>
    startTransition(async () => {
      await updateProfileAction(fd);
      setEditing(false);
    });

  const onPickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES || !OK_TYPES.includes(file.type)) {
      setError(labels.photoTooBig);
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("avatar", file);
    submit(fd);
  };

  return (
    <>
      <div className={`relative shrink-0 ${isPending ? "opacity-60" : ""}`}>
        {avatarUrl ? (
          // Harici (Google) ya da depo avatarı; optimizer'a sokulmaz
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="size-16 rounded-full border border-line object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex size-16 items-center justify-center rounded-full border border-line bg-surface-2 text-2xl font-bold text-accent"
          >
            {initial}
          </span>
        )}
        <button
          type="button"
          aria-label={labels.changePhoto}
          title={labels.changePhoto}
          onClick={() => fileRef.current?.click()}
          className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-line bg-surface-2 text-xs shadow transition hover:border-accent"
        >
          <span aria-hidden>📷</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            onPickPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            className="flex flex-wrap items-center gap-2"
            action={(fd) => submit(fd)}
          >
            <input
              name="name"
              defaultValue={name}
              maxLength={40}
              required
              autoFocus
              className="w-48 rounded-md border border-line bg-surface-2 px-3 py-1.5 text-sm font-semibold outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-bold text-black transition hover:opacity-90 disabled:opacity-50"
            >
              {labels.save}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-muted underline transition-colors hover:text-accent"
            >
              {labels.cancel}
            </button>
          </form>
        ) : (
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span className="truncate">{name}</span>
            <button
              type="button"
              aria-label={labels.editName}
              title={labels.editName}
              onClick={() => setEditing(true)}
              className="shrink-0 text-sm text-muted transition-colors hover:text-accent"
            >
              <span aria-hidden>✏️</span>
            </button>
          </h1>
        )}
        {children}
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    </>
  );
}
