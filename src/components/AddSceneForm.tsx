"use client";

import { useRef, useState, useTransition } from "react";
import { addSceneAction } from "@/app/actions";
import type { ContentCategory } from "@/lib/types";
import { CONTENT_CATEGORIES } from "@/lib/types";

interface Labels {
  addScene: string;
  formTitle: string;
  categoryLabel: string;
  severityLabel: string;
  startLabel: string;
  endLabel: string;
  timeHint: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  submit: string;
  sending: string;
}

interface Props {
  tmdbId: number;
  t: Labels;
  categoryLabels: Record<ContentCategory, string>;
  severityLabels: Record<1 | 2 | 3, string>;
}

const inputCls =
  "w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/25";
const labelCls =
  "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted";

// "12:30" / "1:02:30" biçimli girişler; asıl doğrulama sunucuda yapılır
const TIME_PATTERN = "[0-9]+(:[0-9]{1,2}){0,2}";

export default function AddSceneForm({
  tmdbId,
  t,
  categoryLabels,
  severityLabels,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent active:scale-95"
      >
        ➕ {t.addScene}
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData: FormData) =>
        startTransition(async () => {
          await addSceneAction(formData);
          formRef.current?.reset();
          setOpen(false);
        })
      }
      className="space-y-3 rounded-md border border-accent/40 bg-surface p-4"
    >
      <p className="text-sm font-semibold">{t.formTitle}</p>
      <input type="hidden" name="tmdbId" value={tmdbId} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="col-span-2 block sm:col-span-1">
          <span className={labelCls}>{t.categoryLabel}</span>
          <select name="category" className={inputCls} required>
            {CONTENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabels[cat]}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 block sm:col-span-1">
          <span className={labelCls}>{t.severityLabel}</span>
          <select name="severity" className={inputCls} defaultValue="2" required>
            {([1, 2, 3] as const).map((s) => (
              <option key={s} value={s}>
                {severityLabels[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{t.startLabel}</span>
          <input
            name="start"
            required
            pattern={TIME_PATTERN}
            title={t.timeHint}
            placeholder="12:30"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>{t.endLabel}</span>
          <input
            name="end"
            required
            pattern={TIME_PATTERN}
            title={t.timeHint}
            placeholder="13:05"
            className={inputCls}
          />
        </label>
      </div>
      <p className="text-[11px] text-muted">{t.timeHint}</p>
      <label className="block">
        <span className={labelCls}>{t.descriptionLabel}</span>
        <textarea
          name="description"
          required
          minLength={3}
          maxLength={300}
          rows={2}
          placeholder={t.descriptionPlaceholder}
          className={inputCls}
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {isPending ? t.sending : t.submit}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-line px-4 py-2 text-sm text-muted transition hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </form>
  );
}
