"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  path: string; // /davet/<kimlik>
  copyLabel: string;
  copiedLabel: string;
}

// Davet linki kutusu. Tam adres istemcide kuruluyor çünkü sunucu hangi
// alan adından servis edildiğini bilmiyor (localhost / yerel IP / Vercel).
// Adres state yerine doğrudan input'a yazılıyor: hem gereksiz render
// olmuyor hem de sunucu/istemci çıktısı uyuşmazlığı yaşanmıyor.
export default function InviteLink({ path, copyLabel, copiedLabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = `${window.location.origin}${path}`;
    }
  }, [path]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        readOnly
        defaultValue={path}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-muted"
      />
      <button
        type="button"
        onClick={() => {
          const value = inputRef.current?.value;
          if (!value) return;
          navigator.clipboard?.writeText(value).then(() => setCopied(true));
        }}
        className="shrink-0 rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent active:scale-95"
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
