"use client";

import { Children, useState } from "react";

interface Props {
  previewCount: number;
  listClassName?: string;
  // Metinler sunucuda biçimlenip geliyor: fonksiyon istemci sınırını geçemez
  showAllLabel: string;
  showLessLabel: string;
  children: React.ReactNode;
}

// Değerlendirme listesi: başta yalnızca en yeni birkaçı görünür, "tümünü gör"
// ile kalanı açılır. Yorumlar sunucudan zaten yeniden eskiye sıralı geldiği
// için burada ek sıralama yapılmıyor, yalnızca kırpılıyor.
export default function CommentsPreview({
  previewCount,
  listClassName = "space-y-2",
  showAllLabel,
  showLessLabel,
  children,
}: Props) {
  const items = Children.toArray(children);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, previewCount);

  return (
    <>
      <ol className={listClassName}>{visible}</ol>
      {items.length > previewCount && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:border-accent hover:text-accent active:scale-[0.99]"
        >
          {expanded ? showLessLabel : showAllLabel}
        </button>
      )}
    </>
  );
}
