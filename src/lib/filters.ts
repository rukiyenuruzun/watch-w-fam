import type { Film } from "./types";
import type { VerdictTier } from "./score";

// ── Katalog filtreleri ────────────────────────────────────────────────
// URL sorgu parametrelerinden okunur; demo modda ve aramada yerel olarak,
// TMDB modunda mümkün olduğunca /discover parametreleriyle uygulanır.

export type LenKey = "short" | "mid" | "long" | "xlong";
export type DecadeKey =
  | "2020s"
  | "2010s"
  | "2000s"
  | "1990s"
  | "1980s"
  | "older"
  | "classic";
export type SortKey = "popular" | "rating" | "newest" | "risk";
export type RiskFilter = VerdictTier | "analyzed";

export interface FilmFilters {
  genre: number | null;
  risk: RiskFilter | null;
  len: LenKey | null;
  minRating: number | null;
  decade: DecadeKey | null;
  lang: string | null;
  sort: SortKey;
  // Oyuncu/yönetmen filmografisi (arama sonucundaki kişi çipinden gelir)
  person: number | null; // TMDB kişi kimliği
  personName: string | null; // başlıkta göstermek için
}

export const LEN_RANGES: Record<LenKey, { min: number; max: number }> = {
  short: { min: 0, max: 89 },
  mid: { min: 90, max: 119 },
  long: { min: 120, max: 149 },
  xlong: { min: 150, max: 999 },
};

export const DECADE_RANGES: Record<DecadeKey, { from: number; to: number }> = {
  "2020s": { from: 2020, to: 2029 },
  "2010s": { from: 2010, to: 2019 },
  "2000s": { from: 2000, to: 2009 },
  "1990s": { from: 1990, to: 1999 },
  "1980s": { from: 1980, to: 1989 },
  older: { from: 1900, to: 1979 },
  // "Temiz klasikler" rafının "tümünü gör" hedefi; on yıllarla bilerek örtüşür
  classic: { from: 1900, to: 1999 },
};

// Filtre seçeneklerinde sunulan orijinal diller
export const LANGUAGES = ["en", "tr", "fr", "es", "de", "it", "ja", "ko", "hi"];

const RISK_VALUES = new Set(["analyzed", "ok", "risky", "nope", "never"]);
const SORT_VALUES = new Set(["popular", "rating", "newest", "risk"]);

type SearchParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export function parseFilters(sp: SearchParams): FilmFilters {
  const genre = Number(str(sp.genre));
  const rating = Number(str(sp.rating));
  const len = str(sp.len);
  const decade = str(sp.year);
  const risk = str(sp.risk);
  const lang = str(sp.lang);
  const sort = str(sp.sort);
  const person = Number(str(sp.person));
  const personName = str(sp.pname).trim().slice(0, 60);
  return {
    genre: Number.isInteger(genre) && genre > 0 ? genre : null,
    risk: RISK_VALUES.has(risk) ? (risk as RiskFilter) : null,
    len: len in LEN_RANGES ? (len as LenKey) : null,
    minRating: rating >= 1 && rating <= 10 ? rating : null,
    decade: decade in DECADE_RANGES ? (decade as DecadeKey) : null,
    lang: LANGUAGES.includes(lang) ? lang : null,
    sort: SORT_VALUES.has(sort) ? (sort as SortKey) : "popular",
    person: Number.isInteger(person) && person > 0 ? person : null,
    personName: personName || null,
  };
}

export function hasActiveFilter(f: FilmFilters): boolean {
  return Boolean(
    f.genre ||
      f.risk ||
      f.len ||
      f.minRating ||
      f.decade ||
      f.lang ||
      f.person ||
      f.sort !== "popular"
  );
}

// Risk filtresi hariç her şeyi yerel listeye uygular (risk, analiz verisi
// gerektirdiği için sayfada ayrıca uygulanır). Bilgi yoksa (ör. arama
// sonucunda süre gelmez) film filtreyi karşılayamıyor sayılır.
export function applyLocalFilters(films: Film[], f: FilmFilters): Film[] {
  let out = films;
  if (f.genre) out = out.filter((m) => m.genreIds.includes(f.genre!));
  if (f.len) {
    const { min, max } = LEN_RANGES[f.len];
    out = out.filter((m) => m.runtime !== null && m.runtime >= min && m.runtime <= max);
  }
  if (f.minRating) out = out.filter((m) => (m.voteAverage ?? 0) >= f.minRating!);
  if (f.decade) {
    const { from, to } = DECADE_RANGES[f.decade];
    out = out.filter(
      (m) => m.releaseYear !== null && m.releaseYear >= from && m.releaseYear <= to
    );
  }
  if (f.lang) out = out.filter((m) => m.originalLanguage === f.lang);
  return sortFilms(out, f.sort);
}

export function sortFilms(films: Film[], sort: SortKey): Film[] {
  const out = [...films];
  if (sort === "rating") out.sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0));
  if (sort === "newest") out.sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));
  // "risk" analiz verisi gerektirir; ana sayfada skorlar hesaplandıktan
  // sonra uygulanır (sortFilmsByRisk), burada sıra korunur
  return out;
}

// Risksizden riskliye; analizi olmayanlar (risk bilinmiyor) sona, kendi
// aralarındaki sıra bozulmadan
export function sortFilmsByRisk(films: Film[], risks: Map<number, number>): Film[] {
  return [...films].sort(
    (a, b) => (risks.get(a.tmdbId) ?? Infinity) - (risks.get(b.tmdbId) ?? Infinity)
  );
}
