import Link from "next/link";
import FilmCard from "@/components/FilmCard";
import { getCompletedAnalyses } from "@/lib/analysis";
import { getIdentity } from "@/lib/auth";
import { getVerifiedEventsMap } from "@/lib/contributions";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import {
  computeCategoryScores,
  computeOverallRisk,
  verdictTier,
  VERDICT_META,
} from "@/lib/score";
import { getSensitivity } from "@/lib/sensitivity";
import { getFilm } from "@/lib/tmdb";
import type { Film } from "@/lib/types";
import { getWatchlist } from "@/lib/watchlist";

export default async function WatchlistPage({
  searchParams,
}: PageProps<"/listem">) {
  const sp = await searchParams;
  const sortByRisk = sp.sirala === "risk";
  const locale = await getLocale();
  const t = DICTIONARIES[locale];

  const { token: myToken } = await getIdentity();
  const [entries, personal] = await Promise.all([
    getWatchlist(myToken), // en son eklenen başta
    getSensitivity(myToken),
  ]);
  let films = (
    await Promise.all(entries.map((e) => getFilm(e.tmdbId, locale)))
  ).filter((f): f is Film => f !== null);

  // Analizli filmlerde hüküm rozeti (katalogla aynı görünüm) + risk puanı
  const badges = new Map<number, { emoji: string; label: string }>();
  const risks = new Map<number, number>();
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
    risks.set(film.tmdbId, overall);
    const tier = verdictTier(overall, film.minAge);
    badges.set(film.tmdbId, {
      emoji: VERDICT_META[tier].emoji,
      label: t.verdicts[tier].title,
    });
  }

  if (sortByRisk) {
    // Risksizden riskliye; analizi olmayanlar (risk bilinmiyor) en sona
    films = [...films].sort(
      (a, b) =>
        (risks.get(a.tmdbId) ?? Infinity) - (risks.get(b.tmdbId) ?? Infinity)
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {t.watchlist.title}{" "}
            {films.length > 0 && (
              <span className="text-base font-normal text-muted">
                ({films.length})
              </span>
            )}
          </h1>
          <p className="mt-1 text-xs text-muted">{t.watchlist.note}</p>
        </div>
        {films.length > 1 && (
          <Link
            href={sortByRisk ? "/listem" : "/listem?sirala=risk"}
            scroll={false}
            role="switch"
            aria-checked={sortByRisk}
            title={t.watchlist.sortByRiskHint}
            className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
              sortByRisk ? "text-accent" : "text-muted hover:text-accent"
            }`}
          >
            {t.watchlist.sortByRisk}
            <span
              className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
                sortByRisk ? "border-accent bg-accent" : "border-line bg-surface-2"
              }`}
            >
              <span
                className={`absolute left-0.5 top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-transform duration-200 ${
                  sortByRisk ? "translate-x-4 bg-black" : "bg-white/80"
                }`}
              />
            </span>
          </Link>
        )}
      </div>

      {films.length === 0 ? (
        <p className="rounded-md border border-line bg-surface p-6 text-center text-sm text-muted">
          {t.watchlist.empty}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {films.map((film) => (
            <FilmCard
              key={film.tmdbId}
              film={film}
              badge={badges.get(film.tmdbId)}
              watchlist={{
                inList: true,
                addLabel: t.watchlist.add,
                removeLabel: t.watchlist.remove,
                inListLabel: t.watchlist.inList,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
