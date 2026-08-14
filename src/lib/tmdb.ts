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

// Ülke başına yaşı belirlenebilen en yüksek sınır (aynı ülkede sinema/dijital
// gibi birden çok sürüm olabilir, uyarı eksik kalmasın diye en yükseği alınır)
function certificationsByCountry(
  releaseDates: any
): Map<string, { code: string; age: number }> {
  const results = (releaseDates?.results as any[]) ?? [];
  const map = new Map<string, { code: string; age: number }>();
  for (const country of CERT_COUNTRIES) {
    const entry = results.find((r) => r.iso_3166_1 === country);
    if (!entry) continue;
    const best = ((entry.release_dates as any[]) ?? [])
      .map((d) => String(d.certification ?? "").trim())
      .filter(Boolean)
      .map((code) => ({ code, age: certificationAge(code) }))
      .filter((c): c is { code: string; age: number } => c.age !== null)
      .sort((a, b) => b.age - a.age)[0];
    if (best) map.set(country, best);
  }
  return map;
}

// Rozette gösterilen sınır: CERT_COUNTRIES sırasındaki ilk ülke (TR varsa TR)
function pickCertification(
  byCountry: Map<string, { code: string; age: number }>
): { code: string; country: string } | null {
  for (const country of CERT_COUNTRIES) {
    const hit = byCountry.get(country);
    if (hit) return { code: hit.code, country };
  }
  return null;
}

// Hüküm için kullanılan sınır: ülkeler arasındaki EN KATI olan. Ülkeler aynı
// filme çok farklı yaşlar verebiliyor (After: US 13, FR 16) ve altyazıdan
// görünmeyen görsel içerik çoğu zaman yalnızca katı ülkenin sınırına yansır.
function pickStrictest(
  byCountry: Map<string, { code: string; age: number }>
): { code: string; country: string; age: number } | null {
  let best: { code: string; country: string; age: number } | null = null;
  for (const [country, hit] of byCountry) {
    if (!best || hit.age > best.age) best = { ...hit, country };
  }
  return best;
}

// TMDB sayfa başına 20 sonuç döndürür; "Daha fazla göster" ile 1..pages
// arası sayfalar birlikte çekilir (üst sınır MAX_PAGES).
//
// Tavan neden var: her tıklama 1..N sayfaları BAŞTAN çekip ızgarayı yeniden
// çiziyor, yani maliyet gösterilen film sayısıyla doğrusal artıyor
// (ölçüm: 20 film ≈ 0,09 sn sunucu render). 10 sayfa = 200 film çok erken
// bitiyordu — TMDB'de tek başına komedi türünde 12.800 film var. 25 sayfa
// (500 film) sonunda ~2,5 sn'ye çıkıyor; bunu yalnızca düğmeye 24 kez basan
// görür, ilk açılış hâlâ 0,3 sn.
export const MAX_PAGES = 25;

export interface FilmList {
  films: Film[];
  hasMore: boolean;
}

// "Daha fazla göster" sayfaları 1..N'i baştan çeker; bu yüzden iki çekimin
// AYNI anlık görüntüden gelmesi gerekir. Her sayfanın önbellek süresi kendi
// ilk çekimiyle başladığı için 1. sayfa tazelenirken 2. sayfa eskide
// kalabiliyor ve kullanıcının az önce gördüğü liste karışıyordu. Saatlik
// "kova" değeri tüm sayfalara aynı anda yeni bir önbellek anahtarı verir:
// liste ya tamamen eski ya tamamen yeni olur, yarısı öteki yarısıyla
// çelişmez. TMDB bilinmeyen parametreyi yok sayar.
const SNAPSHOT_SECONDS = 3600;
function snapshotBucket(): string {
  return String(Math.floor(Date.now() / 1000 / SNAPSHOT_SECONDS));
}

// Birleşmiş listeyi "geldiği sayfaya" değil kendi sıralama anahtarına göre
// dizer; eşitlikte kimlik kullanılır ki sonuç her çekimde birebir aynı olsun.
// popularity.desc bilerek YOK: TMDB'nin döndürdüğü popularity değeri kendi
// sıralamasıyla uyuşmuyor (ölçüm: 60 filmde 28 konum), yerelde dizmek listeyi
// düzeltmek yerine TMDB'ye ters düşürürdü — orada sayfa sırası korunur.
const RAW_SORTERS: Record<string, (a: any, b: any) => number> = {
  "vote_average.desc": (a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0),
  "primary_release_date.desc": (a, b) =>
    String(b.release_date ?? "").localeCompare(String(a.release_date ?? "")),
};

async function fetchPages(
  path: string,
  locale: Locale,
  params: Record<string, string>,
  pages: number,
  // Arama sonuçlarında verilmez: orada sıra alaka düzeyidir, bozulmamalı
  sortBy?: string
): Promise<{ films: Film[]; totalPages: number }> {
  const snapshot = snapshotBucket();
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      tmdbFetch(path, locale, {
        ...params,
        page: String(i + 1),
        _snapshot: snapshot,
      })
    )
  );
  // Sayfalar arasında tekrar eden filmleri ele
  const seen = new Set<number>();
  const raw: any[] = [];
  for (const data of results) {
    for (const m of data.results as any[]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      raw.push(m);
    }
  }
  const sorter = sortBy ? RAW_SORTERS[sortBy] : undefined;
  if (sorter) raw.sort(sorter);
  return {
    films: raw.map(mapListItem),
    totalPages: results[0]?.total_pages ?? 1,
  };
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
    pages,
    params.sort_by
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
    const byCountry = certificationsByCountry(m.release_dates);
    const cert = pickCertification(byCountry);
    const strictest = pickStrictest(byCountry);
    return {
      ...mapListItem(m),
      genres: ((m.genres as any[]) ?? []).map((g) => g.name),
      genreIds: ((m.genres as any[]) ?? []).map((g) => g.id),
      cast: ((m.credits?.cast as any[]) ?? []).slice(0, 6).map((c) => c.name),
      director,
      certification: cert?.code ?? null,
      certificationCountry: cert?.country ?? null,
      minAge: cert ? certificationAge(cert.code) : null,
      strictestAge: strictest?.age ?? null,
      strictestCertification: strictest?.code ?? null,
      strictestCountry: strictest?.country ?? null,
    };
  } catch {
    return null;
  }
}
