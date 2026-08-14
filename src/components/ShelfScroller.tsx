"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  prevLabel: string;
  nextLabel: string;
  children: React.ReactNode;
}

// Rafın yatay kaydırıcısı + ok düğmeleri. Düğmeler yalnızca o yönde
// gidilecek yer varken görünür: şeridin başında sol ok, sonunda sağ ok yok.
// Kartlar sunucuda üretilip children olarak geliyor (yalnızca kaydırma
// mantığı istemciye iniyor).
export default function ShelfScroller({ prevLabel, nextLabel, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Kesirli piksel değerleri (zoom, yüksek DPI) için 1px tolerans
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    // Pencere boyutu ve içerik genişliği (poster görselleri geç yüklenebilir)
    // değiştikçe okların görünürlüğü yeniden hesaplanmalı
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => {
      el.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [sync]);

  const scrollBy = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    // Ekranın tamamı kadar değil biraz azı: kenardaki kart ipucu olarak kalsın
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrow =
    "absolute top-[38%] z-10 grid size-10 -translate-y-1/2 place-items-center " +
    "rounded-full border border-line bg-background/85 text-lg backdrop-blur " +
    "transition hover:border-accent hover:text-accent active:scale-95";

  return (
    <div className="relative">
      {canPrev && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label={prevLabel}
          className={`${arrow} -left-2 sm:-left-4`}
        >
          <span aria-hidden>‹</span>
        </button>
      )}

      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]"
      >
        {children}
      </div>

      {canNext && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label={nextLabel}
          className={`${arrow} -right-2 sm:-right-4`}
        >
          <span aria-hidden>›</span>
        </button>
      )}
    </div>
  );
}
