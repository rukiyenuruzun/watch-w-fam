import type { VerdictTier } from "./score";

// ── Elle işaretlenmiş yapımlar ────────────────────────────────────────
//
// Analiz altyazıyı okur ve konuşmasız sahneleri göremez. Bazı yapımlarda
// ise içerik zaten herkesçe biliniyor: erotik seriler altyazıda neredeyse
// hiç konuşma bırakmadan sahne sahne ilerliyor, dolayısıyla otomatik puan
// düşük çıkıyor. Bu liste o yapımlara altyazıdan bağımsız bir ALT SINIR
// koyar — hesaplanan hüküm daha ağırsa o geçerli olur, hafifse buradaki.
//
// Liste bilinçli olarak kısa tutulmalı: kural koyamadığımız, ancak elle
// bilinen durumlar için. Yeni giriş eklerken TMDB kimliğini
// https://www.themoviedb.org/movie/<kimlik> adresinden doğrula.
//
// Kademeler: "risky" (Riskli) < "nope" (İzlenmez) < "never" (HAYATTA izlenmez)

export const FORCED_TIERS: Record<number, VerdictTier> = {
  // After serisi (TMDB koleksiyon 702624) — genç yetişkin erotik dram
  537915: "nope", // After (2019)
  613504: "nope", // After We Collided (2020)
  744275: "nope", // After We Fell (2021)
  744276: "nope", // After Ever Happy (2022)
  820525: "nope", // After Everything (2023)

  // Fifty Shades serisi (TMDB koleksiyon 344830)
  216015: "nope", // Fifty Shades of Grey (2015)
  341174: "nope", // Fifty Shades Darker (2017)
  337167: "nope", // Fifty Shades Freed (2018)

  // 365 Gün serisi (TMDB koleksiyon 829561) — neredeyse baştan sona
  // cinsel sahne; bu yüzden en üst kademe
  664413: "never", // 365 Days (2020)
  829557: "never", // 365 Days: This Day (2022)
  829560: "never", // The Next 365 Days (2022)

  // Culpa / Fault serisi — İspanyol aslı (TMDB koleksiyon 1156666)
  1010581: "nope", // My Fault / Culpa mía (2023)
  1156593: "nope", // Your Fault / Culpa tuya (2024)
  1156594: "nope", // Our Fault / Culpa nuestra (2025)

  // Aynı serinin İngiliz uyarlaması (TMDB koleksiyon 1477387)
  1294203: "nope", // My Fault: London (2025)
  1477317: "nope", // Your Fault: London (2026)
  1477319: "nope", // Our Fault: London
  // Not: "Culpa Mía" (1556888, belgesel) ve "Mica è Colpa Mia" (1397854,
  // İtalyan romantik komedisi) benzer adlı ama bu seriyle ilgisiz — listede yok.
};

// ── Yönetmenine bakarak işaretlenenler ────────────────────────────────
//
// Bazı yönetmenlerde tek tek film saymak anlamsız; imza zaten belli.
// Katalog listeleri TMDB'den yönetmen bilgisi ALAMIYOR (discover/search
// yalnızca film künyesi döndürür, ekip bilgisi film ayrıntısında geliyor),
// bu yüzden iki kanal birden var: aşağıdaki isim kuralı film sayfasında ve
// yeni çıkan yapımlarda devreye girer, altındaki filmografi listesi de
// katalog/arama rozetlerini çalıştırır.
export const FORCED_DIRECTORS: Record<string, VerdictTier> = {
  "Gaspar Noé": "never",
};

// Gaspar Noé'nin TMDB'deki yönetmenlik künyesi (kısa film ve klipler dahil).
// Yenilemek için: /person/14597/movie_credits → job === "Director"
const GASPAR_NOE_FILMS = [
  185809, 396546, 1568, 185818, 49303, 1567, 979, 185815, 1632274, 128920,
  185677, 208478, 700345, 50621, 34647, 1264525, 1702319, 94904, 346942,
  1572103, 292431, 507076, 848616, 599377, 1583707, 807070, 857451, 1410264,
];
for (const id of GASPAR_NOE_FILMS) FORCED_TIERS[id] = "never";

// Elle işaretlenen tüm kimlikler. Bu yapımların analizi olmayabilir ama
// hükmü bellidir; risk filtreleri ve "sadece analizli" görünümü katalog
// kaynağına bunları da eklesin diye ayrı veriliyor.
export function forcedTierIds(): number[] {
  return Object.keys(FORCED_TIERS).map(Number);
}

export function forcedTier(
  tmdbId?: number | null,
  director?: string | null
): VerdictTier | undefined {
  if (tmdbId && FORCED_TIERS[tmdbId]) return FORCED_TIERS[tmdbId];
  return director ? FORCED_DIRECTORS[director.trim()] : undefined;
}
