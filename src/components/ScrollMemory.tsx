"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

function key(): string {
  return `scroll:${location.pathname}${location.search}`;
}

// Next, dinamik sayfalara geri dönüşte kaydırma konumunu güvenilir şekilde geri
// getirmiyor (özellikle bir server action revalidatePath ile istemci önbelleğini
// boşalttıysa). Bu bileşen konumu URL başına sessionStorage'a yazar ve yalnızca
// geri/ileri (popstate) gezinmelerde geri yükler; normal tıklamalar yine sayfa
// başından açılır.
//
// Zamanlama tuzağı: Next kendi popstate dinleyicisini bizden önce kaydettiği
// için hedef sayfa çoğu zaman bizim popstate işleyicimiz koşmadan ÖNCE basılmış
// olur (önbellekten anında commit). Bu yüzden geri yükleme iki koldan denenir:
// popstate anında (sayfa basıldıysa hemen) ve url değişim etkisinde (sayfa
// sonradan basıldıysa). Bekleyen kayıt hedef URL ile etiketlenir ki sonraki
// normal gezinmelere taşmasın.
export default function ScrollMemory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}?${searchParams}`;
  const pending = useRef<{ key: string; top: number } | null>(null);

  useEffect(() => {
    const onPop = () => {
      // popstate sırasında location hedef girdiyi gösterir; kayıtlı konumu
      // hemen oku ki sonradan gelen scroll olayları üzerine yazamasın
      const saved = sessionStorage.getItem(key());
      if (saved === null) {
        pending.current = null;
        return;
      }
      const top = Number(saved);
      pending.current = { key: key(), top };
      // Hedef sayfa çoktan basıldıysa bu çağrı doğru yere oturtur; henüz eski
      // sayfa ekrandaysa kısa gelir ve işi aşağıdaki url etkisi tamamlar
      window.scrollTo({ top, behavior: "instant" });
    };
    window.addEventListener("popstate", onPop);

    // Konumu sürekli kaydet (setItem mikrosaniyelik, kare hızında yazım sorun değil)
    const onScroll = () => {
      try {
        sessionStorage.setItem(key(), String(window.scrollY));
      } catch {
        // sessionStorage kapalıysa özellik sessizce devre dışı kalır
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Sayfa basıldıktan sonra çalışır: bekleyen geri yükleme bu URL'ye aitse
  // uygula; değilse (normal tıklamayla başka sayfaya gidildi) sil.
  // "instant" şart — html'de scroll-smooth var, animasyonlu kayma istemiyoruz.
  useEffect(() => {
    const p = pending.current;
    if (p === null) return;
    pending.current = null;
    if (p.key === key()) {
      window.scrollTo({ top: p.top, behavior: "instant" });
    }
  }, [url]);

  return null;
}
