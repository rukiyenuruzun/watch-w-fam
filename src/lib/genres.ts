import type { Locale } from "./i18n";

// TMDB'nin sabit film türü kimlikleri — hem demo modda hem gerçek API'de
// filtre seçenekleri buradan üretilir (TV Movie hariç tutuldu).
export const GENRES: { id: number; tr: string; en: string }[] = [
  { id: 28, tr: "Aksiyon", en: "Action" },
  { id: 12, tr: "Macera", en: "Adventure" },
  { id: 16, tr: "Animasyon", en: "Animation" },
  { id: 35, tr: "Komedi", en: "Comedy" },
  { id: 80, tr: "Suç", en: "Crime" },
  { id: 99, tr: "Belgesel", en: "Documentary" },
  { id: 18, tr: "Dram", en: "Drama" },
  { id: 10751, tr: "Aile", en: "Family" },
  { id: 14, tr: "Fantastik", en: "Fantasy" },
  { id: 36, tr: "Tarih", en: "History" },
  { id: 27, tr: "Korku", en: "Horror" },
  { id: 10402, tr: "Müzik", en: "Music" },
  { id: 9648, tr: "Gizem", en: "Mystery" },
  { id: 10749, tr: "Romantik", en: "Romance" },
  { id: 878, tr: "Bilim Kurgu", en: "Science Fiction" },
  { id: 53, tr: "Gerilim", en: "Thriller" },
  { id: 10752, tr: "Savaş", en: "War" },
  { id: 37, tr: "Western", en: "Western" },
];

export function genreOptions(locale: Locale) {
  return GENRES.map((g) => ({ id: g.id, label: g[locale] })).sort((a, b) =>
    a.label.localeCompare(b.label, locale)
  );
}
