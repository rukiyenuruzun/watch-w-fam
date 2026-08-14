"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface Props {
  src: string; // büyük boy afiş adresi
  alt: string;
  closeLabel: string;
  children: React.ReactNode; // sunucuda çizilen küçük afiş
}

// Film sayfasındaki afişe basılınca büyük hâlini tam ekran açar.
// Kapatma: karanlık alana tıklama, kapat düğmesi ya da Esc.
export default function PosterLightbox({ src, alt, closeLabel, children }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Arkadaki sayfa kaymasın
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={alt}
        className="block w-full cursor-zoom-in transition hover:brightness-110 active:scale-[0.99]"
      >
        {children}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-line bg-background/80 text-xl transition hover:border-accent hover:text-accent"
          >
            <span aria-hidden>×</span>
          </button>
          <Image
            src={src}
            alt={alt}
            width={780}
            height={1170}
            // Tıklama karanlık alana gitmesin diye görselde durdurulur
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-auto cursor-default rounded-md object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
