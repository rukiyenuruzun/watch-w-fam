import Image from "next/image";
import Link from "next/link";
import FilmCard from "@/components/FilmCard";
import FilmShelf, { type ShelfItem } from "@/components/FilmShelf";
import FilterBar from "@/components/FilterBar";
import {
  getAnalyzedIds,
  getCompletedAnalyses,
  getRecentAnalyzedIds,
} from "@/lib/analysis";
import { getIdentity } from "@/lib/auth";
import { getVerifiedEventsMap } from "@/lib/contributions";
import { getSensitivity } from "@/lib/sensitivity";
import { getWatchlistIds } from "@/lib/watchlist";
import {
  applyLocalFilters,
  DECADE_RANGES,
  hasActiveFilter,
  LANGUAGES,
  LEN_RANGES,
  parseFilters,
} from "@/lib/filters";
import type { Film } from "@/lib/types";
import { genreOptions } from "@/lib/genres";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import {
  computeCategoryScores,
  computeOverallRisk,
  verdictTier,
  VERDICT_META,
  type VerdictTier,
} from "@/lib/score";
import {
  getFilm,
  hasTmdbKey,
  listFilms,
  MAX_PAGES,
  searchFilms,
  searchPeople,
  type PersonHit,
} from "@/lib/tmdb";

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const query = typeof sp.q === "string" ? sp.q.trim() : "";
  const filters = parseFilters(sp);
  const pages = Math.min(
    MAX_PAGES,
    Math.max(1, Number(typeof sp.pages === "string" ? sp.pages : 1) || 1)
  );

  // Risk filtresi seçiliyken kaynak TMDB sayfaları değil, analiz arşivinin
  // tamamıdır: bütün analizli filmler tek seferde gelir, "daha fazla" gerekmez.
  let films: Film[];
  let hasMore = false;
  let people: PersonHit[] = [];
  if (filters.risk) {
    const ids = await getAnalyzedIds();
    const all = (
      await Promise.all(ids.map((id) => getFilm(id, locale)))
    ).filter((f) => f !== null);
    const q = query.toLocaleLowerCase("tr");
    const base = query
      ? all.filter(
          (f) =>
            f.title.toLocaleLowerCase("tr").includes(q) ||
            f.originalTitle.toLocaleLowerCase("tr").includes(q)
        )
      : all;
    films = applyLocalFilters(base, filters);
  } else {
    // Kişi seçiliyse filmografi (discover with_people) listelenir; sorgu
    // varsa film araması + kişi araması (çipler için) birlikte yapılır
    const useSearch = Boolean(query) && !filters.person;
    const [list, found] = await Promise.all([
      useSearch
        ? searchFilms(query, locale, filters, pages)
        : listFilms(locale, filters, pages),
      useSearch ? searchPeople(query, locale) : Promise.resolve([]),
    ]);
    films = list.films;
    hasMore = list.hasMore;
    people = found;
  }

  // Bu ziyaretçinin kimliği: izleme listesi + hassasiyet profili
  const { token: myToken } = await getIdentity();
  const [watchlistIds, personal] = await Promise.all([
    getWatchlistIds(myToken),
    getSensitivity(myToken),
  ]);

  // Analizi tamamlanmış filmlerin hüküm katmanını hesapla
  // (katalog rozetleri + risk filtresi bunu kullanır) — tek toplu sorgu.
  // Doğrulanmış topluluk sahneleri de skora katılır (film sayfasıyla tutarlı).
  const tiers = new Map<number, VerdictTier>();
  const ids = films.map((f) => f.tmdbId);
  const [analyses, extras] = await Promise.all([
    getCompletedAnalyses(ids),
    getVerifiedEventsMap(ids),
  ]);
  for (const film of films) {
    const analysis = analyses.get(film.tmdbId);
    if (!analysis) continue;
    const extra = extras.get(film.tmdbId);
    const merged = extra
      ? { ...analysis, events: [...analysis.events, ...extra] }
      : analysis;
    const overall = computeOverallRisk(
      computeCategoryScores(merged, film.runtime),
      personal
    );
    tiers.set(film.tmdbId, verdictTier(overall));
  }

  if (filters.risk) {
    films = films.filter((film) => {
      const tier = tiers.get(film.tmdbId);
      if (!tier) return false;
      return filters.risk === "analyzed" || tier === filters.risk;
    });
  }

  // Kartlardaki yer imi simgesi için
  const watchlistProps = (id: number) => ({
    inList: watchlistIds.has(id),
    addLabel: t.watchlist.add,
    removeLabel: t.watchlist.remove,
    inListLabel: t.watchlist.inList,
  });
  const badgeFor = (id: number) => {
    const tier = tiers.get(id);
    return tier
      ? { emoji: VERDICT_META[tier].emoji, label: t.verdicts[tier].title }
      : undefined;
  };

  // Küratörlü raflar: yalnızca varsayılan görünümde (arama/filtre yokken).
  // Analiz arşivinin tamamından türetilir; hükümler ziyaretçinin hassasiyet
  // profiliyle hesaplandığı için raf içerikleri de kişiseldir.
  let shelfDefs: { title: string; href: string; items: ShelfItem[] }[] = [];
  if (!query && !hasActiveFilter(filters)) {
    const [allIds, recentIds] = await Promise.all([
      getAnalyzedIds(),
      getRecentAnalyzedIds(12),
    ]);
    const shelfFilms = (
      await Promise.all(allIds.map((id) => getFilm(id, locale)))
    ).filter((f): f is Film => f !== null);
    const [shelfAnalyses, shelfExtras] = await Promise.all([
      getCompletedAnalyses(allIds),
      getVerifiedEventsMap(allIds),
    ]);
    for (const film of shelfFilms) {
      if (tiers.has(film.tmdbId)) continue;
      const analysis = shelfAnalyses.get(film.tmdbId);
      if (!analysis) continue;
      const extra = shelfExtras.get(film.tmdbId);
      const merged = extra
        ? { ...analysis, events: [...analysis.events, ...extra] }
        : analysis;
      tiers.set(
        film.tmdbId,
        verdictTier(
          computeOverallRisk(computeCategoryScores(merged, film.runtime), personal)
        )
      );
    }

    const byId = new Map(shelfFilms.map((f) => [f.tmdbId, f]));
    const isOk = (f: Film) => tiers.get(f.tmdbId) === "ok";
    const byRating = (a: Film, b: Film) =>
      (b.voteAverage ?? 0) - (a.voteAverage ?? 0);
    const toItems = (list: Film[]): ShelfItem[] =>
      list.slice(0, 12).map((film) => ({
        film,
        badge: badgeFor(film.tmdbId),
        watchlist: watchlistProps(film.tmdbId),
      }));

    shelfDefs = [
      {
        title: t.shelves.recent,
        href: "/?risk=analyzed#katalog",
        items: toItems(
          recentIds
            .map((id) => byId.get(id))
            .filter((f): f is Film => Boolean(f))
        ),
      },
      {
        title: t.shelves.familyComedies,
        href: "/?genre=35&risk=ok#katalog",
        items: toItems(
          shelfFilms
            .filter((f) => isOk(f) && f.genreIds.includes(35))
            .sort(byRating)
        ),
      },
      {
        title: t.shelves.cleanClassics,
        href: "/?risk=ok&year=classic#katalog",
        items: toItems(
          shelfFilms
            .filter(
              (f) => isOk(f) && f.releaseYear !== null && f.releaseYear <= 1999
            )
            .sort(byRating)
        ),
      },
    ];
  }

  // Dil adları yerelleştirilmiş hâliyle (Intl, ekstra sözlük gerektirmez)
  const langNames = new Intl.DisplayNames([locale], { type: "language" });
  const all = { value: "", label: t.filters.all };
  const fields = [
    {
      name: "genre",
      label: t.filters.genre,
      value: filters.genre ? String(filters.genre) : "",
      options: [
        all,
        ...genreOptions(locale).map((g) => ({ value: String(g.id), label: g.label })),
      ],
    },
    {
      name: "risk",
      label: t.filters.risk,
      value: filters.risk ?? "",
      options: [
        all,
        { value: "analyzed", label: t.filters.analyzedOnly },
        ...(["ok", "risky", "nope", "never"] as const).map((tier) => ({
          value: tier,
          label: t.filters.risks[tier],
        })),
      ],
    },
    {
      name: "len",
      label: t.filters.length,
      value: filters.len ?? "",
      options: [
        all,
        ...(Object.keys(LEN_RANGES) as (keyof typeof LEN_RANGES)[]).map((k) => ({
          value: k,
          label: t.filters.lengths[k],
        })),
      ],
    },
    {
      name: "rating",
      label: t.filters.rating,
      value: filters.minRating ? String(filters.minRating) : "",
      options: [
        all,
        ...[6, 7, 8].map((n) => ({
          value: String(n),
          label: t.filters.ratingAtLeast(n),
        })),
      ],
    },
    {
      name: "year",
      label: t.filters.year,
      value: filters.decade ?? "",
      options: [
        all,
        ...(Object.keys(DECADE_RANGES) as (keyof typeof DECADE_RANGES)[]).map(
          (k) => ({ value: k, label: t.filters.decades[k] })
        ),
      ],
    },
    {
      name: "lang",
      label: t.filters.language,
      value: filters.lang ?? "",
      options: [
        all,
        ...LANGUAGES.map((code) => ({
          value: code,
          label: langNames.of(code) ?? code,
        })),
      ],
    },
    {
      name: "sort",
      label: t.filters.sort,
      value: filters.sort,
      options: (["popular", "rating", "newest"] as const).map((k) => ({
        value: k,
        label: t.filters.sorts[k],
      })),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero: görsel ortada kendi oranında (üst/alt kırpık, yazısız sürüm);
          kenarları aynı görselin bulanık ve karartılmış hâli doldurur.
          Keskin görselin sağ-sol uçları maskeyle şeffaflaşır ki bulanık
          zemine çizgisiz, buğulu bir geçiş olsun. */}
      <section className="relative -mx-4 -mt-8 h-90 overflow-hidden sm:-mx-6 sm:h-110 lg:-mx-10">
        <Image
          src="/hero-wide3.jpg"
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="scale-110 object-cover brightness-[0.22] blur-2xl"
        />
        <div className="absolute inset-0 flex justify-center">
          {/* Maske görselin kendi kenarlarına göre uygulanır (sarmalayıcı,
              görselle aynı oranda) — geniş ekranda da çizgisiz geçiş kalır */}
          {/* Soldurma bandı dar (%5) — kenardaki eller görünür kalsın */}
          <div className="relative aspect-[61/31] h-full max-w-full [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
            <Image
              src="/hero-wide3.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />
      </section>

      <section className="space-y-5 px-4 text-center">
        <h1 className="font-serif text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          {t.heroLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="#katalog"
            className="inline-block rounded-md bg-accent px-6 py-3 text-sm font-bold text-black shadow-lg transition hover:opacity-90 active:scale-95"
          >
            {t.heroCta}
          </a>
          {/* Sunucu, hassasiyet profiline göre izlenir/riskli bir film seçip
              yönlendirir — sayfa değil route handler olduğundan düz <a> */}
          <a
            href="/rastgele"
            className="inline-block rounded-md border border-line bg-surface px-6 py-3 text-sm font-bold transition hover:border-accent hover:text-accent active:scale-95"
          >
            {t.heroRandom}
          </a>
        </div>
      </section>

      {/* Küratörlü raflar (yalnızca varsayılan görünümde dolu gelir) —
          arama/filtre kutusunun ÜSTÜNDE dururlar, sayfa raflarla açılır */}
      {shelfDefs.map((shelf) => (
        <FilmShelf
          key={shelf.title}
          title={shelf.title}
          seeAllHref={shelf.href}
          seeAllLabel={t.shelves.seeAll}
          items={shelf.items}
        />
      ))}

      {/* #katalog çapası filtre kutusunda: filtre seçince/CTA'ya basınca sayfa
          buraya iner — filtreler görünür, filmler hemen altında. scroll-mt
          yapışkan üst menünün altında kalmasını önler. */}
      <div id="katalog" className="mx-auto w-full max-w-7xl scroll-mt-24 space-y-4">
        <FilterBar
          // Değerler değişince (özellikle "Temizle" sonrası) seçim kutularının
          // yeniden kurulup güncel değeri göstermesi için key değerlerden türetilir
          key={[query, ...fields.map((f) => f.value)].join("|")}
          query={query}
          searchPlaceholder={t.searchPlaceholder}
          searchButton={t.searchButton}
          recentLabel={t.recentSearches}
          removeRecentLabel={t.removeSearch}
          clearLabel={t.filters.clear}
          fields={fields}
          hasActive={hasActiveFilter(filters) || Boolean(query)}
        />

        {!hasTmdbKey() && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-300">
            {t.demoModeNotice}
          </p>
        )}
      </div>

      <section className="mx-auto w-full max-w-5xl">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          {filters.person
            ? t.personFilms(filters.personName ?? "")
            : query
              ? t.resultsFor(query)
              : t.popularFilms}
        </h2>
        {people.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">{t.peopleHint}</span>
            {people.map((p) => (
              <Link
                key={p.id}
                href={`/?person=${p.id}&pname=${encodeURIComponent(p.name)}#katalog`}
                className="rounded-full border border-line bg-surface px-3 py-1.5 font-semibold transition hover:border-accent hover:text-accent"
              >
                🎬 {p.name}
              </Link>
            ))}
          </div>
        )}
        {films.length === 0 ? (
          <p className="rounded-md border border-line bg-surface p-6 text-center text-sm text-muted">
            {t.noResults}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {films.map((film) => {
              const tier = tiers.get(film.tmdbId);
              return (
                <FilmCard
                  key={film.tmdbId}
                  film={film}
                  badge={
                    tier
                      ? {
                          emoji: VERDICT_META[tier].emoji,
                          label: t.verdicts[tier].title,
                        }
                      : undefined
                  }
                  watchlist={watchlistProps(film.tmdbId)}
                />
              );
            })}
          </div>
        )}
        {hasMore && (
          <div className="mt-6 text-center">
            <Link
              href={`/?${(() => {
                const p = new URLSearchParams();
                for (const key of ["q", "genre", "risk", "len", "rating", "year", "lang", "sort", "person", "pname"]) {
                  const v = sp[key];
                  if (typeof v === "string" && v) p.set(key, v);
                }
                p.set("pages", String(pages + 1));
                return p.toString();
              })()}#katalog`}
              scroll={false}
              className="inline-block rounded-md border border-line bg-surface px-6 py-2.5 text-sm font-semibold transition hover:border-accent hover:text-accent active:scale-95"
            >
              {t.loadMore}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
