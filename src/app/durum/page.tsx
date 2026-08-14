import Link from "next/link";
import AutoRefresh from "@/components/AutoRefresh";
import FilmCard from "@/components/FilmCard";
import RemoveRequestButton from "@/components/RemoveRequestButton";
import RequestAnalysisButton from "@/components/RequestAnalysisButton";
import {
  getAnalyzedIds,
  getCompletedAnalyses,
  getRequests,
} from "@/lib/analysis";
import { getIdentity } from "@/lib/auth";
import { getVerifiedEventsMap } from "@/lib/contributions";
import { getWatchlistIds } from "@/lib/watchlist";
import { DICTIONARIES } from "@/lib/i18n";
import { forcedTier } from "@/lib/known-titles";
import { getLocale } from "@/lib/locale";
import { getQuota } from "@/lib/opensubtitles";
import { getSensitivity } from "@/lib/sensitivity";
import {
  computeCategoryScores,
  computeOverallRisk,
  verdictTier,
  VERDICT_META,
} from "@/lib/score";
import { getFilm } from "@/lib/tmdb";
import type { Film } from "@/lib/types";

function formatTime(iso: string | number, locale: string): string {
  const date = typeof iso === "number" ? new Date(iso * 1000) : new Date(iso);
  return date.toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

export default async function StatusPage() {
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const s = t.statusPage;

  const [quota, requests, analyzedIds] = await Promise.all([
    getQuota(),
    getRequests(),
    getAnalyzedIds(),
  ]);
  const { token: myToken } = await getIdentity();
  const [watchlistIds, personal] = await Promise.all([
    getWatchlistIds(myToken),
    getSensitivity(myToken),
  ]);

  // Kuyruktaki ve analizli filmlerin başlıkları
  const queueFilms = new Map<number, Film | null>();
  await Promise.all(
    requests.map(async (r) => {
      queueFilms.set(r.tmdbId, await getFilm(r.tmdbId, locale));
    })
  );
  const analyzedFilms = (
    await Promise.all(analyzedIds.map((id) => getFilm(id, locale)))
  ).filter((f): f is Film => f !== null);

  const badges = new Map<number, { emoji: string; label: string }>();
  const analyzedIdsList = analyzedFilms.map((f) => f.tmdbId);
  const [analyses, extras] = await Promise.all([
    getCompletedAnalyses(analyzedIdsList),
    getVerifiedEventsMap(analyzedIdsList),
  ]);
  for (const film of analyzedFilms) {
    const analysis = analyses.get(film.tmdbId);
    if (!analysis) {
      // Elle işaretlenmiş yapımlar analiz beklemeden hükmünü alır
      const forced = forcedTier(film.tmdbId);
      if (forced) {
        badges.set(film.tmdbId, {
          emoji: VERDICT_META[forced].emoji,
          label: t.verdicts[forced].title,
        });
      }
      continue;
    }
    const extra = extras.get(film.tmdbId);
    const merged = extra
      ? { ...analysis, events: [...analysis.events, ...extra] }
      : analysis;
    const tier = verdictTier(
      computeOverallRisk(computeCategoryScores(merged, film.runtime), personal),
      film
    );
    badges.set(film.tmdbId, {
      emoji: VERDICT_META[tier].emoji,
      label: t.verdicts[tier].title,
    });
  }

  const quotaRatio = quota ? quota.used / Math.max(1, quota.allowed) : 0;
  const quotaColor =
    quotaRatio >= 1 ? "#d03b3b" : quotaRatio >= 0.7 ? "#fab219" : "#0ca30c";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <AutoRefresh intervalMs={30000} />
      <h1 className="text-2xl font-bold">{s.title}</h1>

      <section className="rounded-md border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {s.quotaTitle}
        </h2>
        {quota ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-[4px] bg-surface-2">
                <div
                  className="h-full rounded-r-[4px]"
                  style={{
                    width: `${Math.min(100, quotaRatio * 100)}%`,
                    backgroundColor: quotaColor,
                  }}
                />
              </div>
              <span className="shrink-0 font-mono text-sm tabular-nums">
                {s.quotaLine(quota.used, quota.allowed)}
              </span>
            </div>
            {quota.resetsAt && (
              <p className="text-xs text-muted">
                {s.quotaResets(formatTime(quota.resetsAt, locale))}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">{s.quotaUnavailable}</p>
        )}
      </section>

      <section className="rounded-md border border-line bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {s.queueTitle} ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <p className="text-sm text-muted">{s.queueEmpty}</p>
        ) : (
          <ol className="divide-y divide-line">
            {requests.map((r) => {
              const film = queueFilms.get(r.tmdbId);
              const status =
                r.status && r.status in t.statuses
                  ? t.statuses[r.status as keyof typeof t.statuses]
                  : t.statuses.requested;
              return (
                <li
                  key={r.tmdbId}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm"
                >
                  <Link
                    href={`/film/${r.tmdbId}`}
                    className="font-semibold hover:text-accent"
                  >
                    {film?.title ?? `tmdb:${r.tmdbId}`}
                  </Link>
                  <span className="text-xs text-muted">
                    {s.requestedAtLabel}: {formatTime(r.requestedAt, locale)}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      r.status === "quota_exceeded" || r.status === "worker_error"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-surface-2 text-muted"
                    }`}
                  >
                    {status}
                  </span>
                  {(r.status === "quota_exceeded" || r.status === "worker_error") &&
                    r.retryAt && (
                      <span className="text-xs text-muted">
                        {s.retryScheduled(formatTime(r.retryAt, locale))}
                      </span>
                    )}
                  {r.status === "subtitle_not_found" && (
                    <span className="flex items-center gap-1.5">
                      <RequestAnalysisButton
                        tmdbId={r.tmdbId}
                        label={t.retryAnalysis}
                        pendingLabel={t.requestPending}
                        small
                      />
                      <RemoveRequestButton
                        tmdbId={r.tmdbId}
                        label={s.removeRequest}
                        pendingLabel={s.removeRequestPending}
                      />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          {s.analyzedTitle} ({analyzedFilms.length})
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {analyzedFilms.map((film) => (
            <FilmCard
              key={film.tmdbId}
              film={film}
              badge={badges.get(film.tmdbId)}
              watchlist={{
                inList: watchlistIds.has(film.tmdbId),
                addLabel: t.watchlist.add,
                removeLabel: t.watchlist.remove,
                inListLabel: t.watchlist.inList,
              }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
