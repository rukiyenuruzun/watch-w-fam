"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Analiz sürerken sayfayı belirli aralıkla sessizce tazeler;
// kullanıcı elle yenilemeden durum geçişlerini görür.
export default function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, router]);

  return null;
}
