import type { Locale } from "./i18n";
import { TMDB_LANG } from "./i18n";
import type { Film } from "./types";
import { getDemoFilms } from "./demo-data";
import {
  applyLocalFilters,
  DECADE_RANGES,
  LEN_RANGES,
  type FilmFilters,
} from "./filters";

// TMDB v3 API anahtarı veya v4 okuma erişim jetonu — ikisinden biri yeterli.
// Anahtar yoksa site demo katalogla çalışır, hiçbir sayfa boş kalmaz.
const API_KEY = process.env.TMDB_API_KEY;
const ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
const BASE = "https://api.themoviedb.org/3";

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function hasTmdbKey(): boolean {
  return Boolean(API_KEY || ACCESS_TOKEN);
}

async function tmdbFetch(
  path: string,
  locale: Locale,
  params: Record<string, string> = {}
) {
  const url = new URL(BASE + path);
  url.searchParams.set("language", TMDB_LANG[locale]);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (API_KEY && !ACCESS_TOKEN) url.searchParams.set("api_key", API_KEY);

  const res = await fetch(url, {
    headers: ACCESS_TOKEN ? { Authorization: `Bearer ${ACCESS_TOKEN}` } : {},
    // Katalog verisi sık değişmez; 1 saat önbellek TMDB kotasını korur.
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapListItem(m: any): Film {
  return {
    tmdbId: m.id,
    title: m.title ?? m.original_title,
    originalTitle: m.original_title,
    releaseYear: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    runtime: m.runtime ?? null,
    posterPath: m.poster_path ?? null,
    backdropPath: m.backdrop_path ?? null,
    overview: m.overview ?? "",
    genres: [],
    genreIds: (m.genre_ids as number[]) ?? [],
    originalLanguage: m.original_language,
    voteAverage: m.vote_average ?? null,
  };
}

// ── Resmî yaş sınırı ────────────────────────────────────────────────
// Türkiye sınırı varsa o, yoksa sırayla ABD/İngiltere/Almanya/İspanya.
// Altyazıda konuşulmayan (görsel) içerik için tek dış kanıt olduğundan
// film sayfasında rozet olarak gösterilir ve hükme taban uygular.
const CERT_COUNTRIES = ["TR", "US", "GB", "DE", "ES", "FR"];

// Harf tabanlı sınırların yaş karşılığı; sayısal olanlar ("16", "18+")
// doğrudan ayrıştırılır.
const CERT_AGES: Record<string, number> = {
  G: 0,
  TV_G: 0,
  APTA: 0,
  U: 0,
  PG: 8,
  "TV-PG": 8,
  "PG-13": 13,
  "TV-14": 14,
  R: 17,
  "NC-17": 18,
  "TV-MA": 17,
  X: 18,
};

export function certificationAge(code: string): number | null {
  const key = code.trim().toUpperCase();
  if (key in CERT_AGES) return CERT_AGES[key];
  const num = key.match(/^(\d{1,2})\s*\+?$/);
  return num ? Number(num[1]) : null;
}

function pickCertification(
  releaseDates: any
): { code: string; country: string } | null {
  const results = (releaseDates?.results as any[]) ?? [];
  for (const country of CERT_COUNTRIES) {
    const entry = results.find((r) => r.iso_3166_1 === country);
    if (!entry) continue;
    // Aynı ülkede birden çok sürüm olabilir (sinema/dijital); yaşı
    // belirlenebilen en yükseği alınır ki uyarı eksik kalmasın
    const codes = ((entry.release_dates as any[]) ?? [])
      .map((d) => String(d.certification ?? "").trim())
      .filter(Boolean);
    if (codes.length === 0) continue;
    const best = codes
      .map((code) => ({ code, age: certificationAge(code) }))
      .filter((c) => c.age !== null)
      .sort((a, b) => (b.age ?? 0) - (a.age ?? 0))[0];
    if (best) return { code: best.code, country };
  }
  return null;
}

// TMDB sayfa başına 20 sonuç döndürür; "Daha fazla göster" ile 1..pages
// arası sayfalar birlikte çekilir (üst sınır MAX_PAGES).
export const MAX_PAGES = 10;

export interface FilmList {
  films: Film[];
  hasMore: boolean;
}

async function fetchPages(
  path: string,
  locale: Locale,
  params: Record<string, string>,
  pages: number
): Promise<{ films: Film[]; totalPages: number }> {
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      tmdbFetch(path, locale, { ...params, page: String(i + 1) })
    )
  );
  // Sayfalar arasında tekrar eden filmleri ele
  const seen = new Set<number>();
  const films: Film[] = [];
  for (const data of results) {
    for (const m of data.results as any[]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      films.push(mapListItem(m));
    }
  }
  return { films, totalPages: results[0]?.total_pages ?? 1 };
}

// Arama: TMDB search filtre parametresi desteklemez, sonuçlara yerel filtre uygulanır.
export async function searchFilms(
  query: string,
  locale: Locale,
  filters: FilmFilters,
  pages = 1
): Promise<FilmList> {
  if (!hasTmdbKey()) {
    const q = query.toLocaleLowerCase("tr");
    const hits = getDemoFilms(locale).filter(
      (f) =>
        f.title.toLocaleLowerCase("tr").includes(q) ||
        f.originalTitle.toLocaleLowerCase("tr").includes(q)
    );
    return { films: applyLocalFilters(hits, filters), hasMore: false };
  }
  const { films, totalPages } = await fetchPages(
    "/search/movie",
    locale,
    { query, include_adult: "false" },
    pages
  );
  return {
    films: applyLocalFilters(films, filters),
    hasMore: pages < Math.min(totalPages, MAX_PAGES),
  };
}

// Kişi araması: sorgu bir oyuncu/yönetmenle eşleşiyorsa çip olarak sunulur
export interface PersonHit {
  id: number;
  name: string;
  department: string | null; // "Acting", "Directing"…
}

export async function searchPeople(
  query: string,
  locale: Locale
): Promise<PersonHit[]> {
  if (!hasTmdbKey()) return [];
  try {
    const data = await tmdbFetch("/search/person", locale, {
      query,
      include_adult: "false",
      page: "1",
    });
    return (data.results as any[])
      .filter((p) => (p.popularity ?? 0) > 1) // alakasız/ölü kayıtları ele
      .slice(0, 2)
      .map((p) => ({
        id: p.id,
        name: p.name,
        department: p.known_for_department ?? null,
      }));
  } catch {
    return [];
  }
}

// Katalog listesi: filtreler TMDB /discover parametrelerine çevrilir.
// (Risk filtresi analiz verisi gerektirdiği için sayfada uygulanır.)
export async function listFilms(
  locale: Locale,
  filters: FilmFilters,
  pages = 1
): Promise<FilmList> {
  if (!hasTmdbKey()) {
    return {
      films: applyLocalFilters(getDemoFilms(locale), filters),
      hasMore: false,
    };
  }

  const params: Record<string, string> = {
    include_adult: "false",
    "vote_count.gte": "50", // çok az oylanmış/önemsiz filmleri ele
  };
  if (filters.genre) params.with_genres = String(filters.genre);
  if (filters.len) {
    params["with_runtime.gte"] = String(LEN_RANGES[filters.len].min);
    params["with_runtime.lte"] = String(LEN_RANGES[filters.len].max);
  }
  if (filters.minRating) params["vote_average.gte"] = String(filters.minRating);
  if (filters.decade) {
    const { from, to } = DECADE_RANGES[filters.decade];
    params["primary_release_date.gte"] = `${from}-01-01`;
    params["primary_release_date.lte"] = `${to}-12-31`;
  }
  if (filters.lang) params.with_original_language = filters.lang;
  if (filters.person) {
    // Kişinin (oyuncu ya da ekip) yer aldığı filmler; filmografide küçük
    // yapımlar da görünsün diye oy tabanı gevşetilir
    params.with_people = String(filters.person);
    params["vote_count.gte"] = "5";
  }
  params.sort_by =
    filters.sort === "rating"
      ? "vote_average.desc"
      : filters.sort === "newest"
        ? "primary_release_date.desc"
        : "popularity.desc";
  if (filters.sort === "rating") params["vote_count.gte"] = "300";

  const { films, totalPages } = await fetchPages(
    "/discover/movie",
    locale,
    params,
    pages
  );
  return { films, hasMore: pages < Math.min(totalPages, MAX_PAGES) };
}

export async function getFilm(
  tmdbId: number,
  locale: Locale
): Promise<Film | null> {
  if (!hasTmdbKey()) {
    return getDemoFilms(locale).find((f) => f.tmdbId === tmdbId) ?? null;
  }
  try {
    const m = await tmdbFetch(`/movie/${tmdbId}`, locale, {
      append_to_response: "credits,release_dates",
    });
    const director = (m.credits?.crew as any[] | undefined)?.find(
      (c) => c.job === "Director"
    )?.name;
    const cert = pickCertification(m.release_dates);
    return {
      ...mapListItem(m),
      genres: ((m.genres as any[]) ?? []).map((g) => g.name),
      genreIds: ((m.genres as any[]) ?? []).map((g) => g.id),
      cast: ((m.credits?.cast as any[]) ?? []).slice(0, 6).map((c) => c.name),
      director,
      certification: cert?.code ?? null,
      certificationCountry: cert?.country ?? null,
      minAge: cert ? certificationAge(cert.code) : null,
    };
  } catch {
    return null;
  }
}
