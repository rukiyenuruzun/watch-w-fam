import Image from "next/image";
import { notFound } from "next/navigation";
import AnalysisPanel from "@/components/AnalysisPanel";
import CommentsSection from "@/components/CommentsSection";
import WatchlistToggle from "@/components/WatchlistToggle";
import { getAnalysis } from "@/lib/analysis";
import { getIdentity } from "@/lib/auth";
import { getContributions, toVerifiedEvents } from "@/lib/contributions";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import {
  computeCategoryScores,
  computeOverallRisk,
  verdictTier,
} from "@/lib/score";
import { getSensitivity } from "@/lib/sensitivity";
import { getFilm, TMDB_IMAGE_BASE } from "@/lib/tmdb";
import { getWatchlistIds } from "@/lib/watchlist";

export default async function FilmPage({
  params,
  searchParams,
}: PageProps<"/film/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const tmdbId = Number(id);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) notFound();

  const locale = await getLocale();
  const t = DICTIONARIES[locale];

  const film = await getFilm(tmdbId, locale);
  if (!film) notFound();

  const analysis = await getAnalysis(tmdbId);
  const { token: myToken } = await getIdentity();
  const [watchlistIds, personal, community] = await Promise.all([
    getWatchlistIds(myToken),
    getSensitivity(myToken),
    getContributions(tmdbId, myToken),
  ]);
  const inWatchlist = watchlistIds.has(tmdbId);

  // "Rastgele güvenli film" ile gelindiyse hükme göre şans bandı gösterilir
  // (yalnızca izlenir/riskli — elle yazılmış adreslerde başka hüküm çıkarsa bant yok)
  let randomTier: "ok" | "risky" | null = null;
  if (sp.rastgele === "1" && analysis.status === "completed") {
    const merged = {
      ...analysis,
      events: [...analysis.events, ...toVerifiedEvents(community)],
    };
    const tier = verdictTier(
      computeOverallRisk(
        computeCategoryScores(merged, film.runtime),
        personal
      ),
      film.minAge
    );
    if (tier === "ok" || tier === "risky") randomTier = tier;
  }

  return (
    <div className="space-y-8">
      {/* Üst bölüm (Letterboxd tarzı): backdrop üstte net ve tam görünür bir
          bant; alta doğru sayfanın karanlığına erir, poster + künye bandın
          alt kısmının üzerine biner */}
      <section className="relative -mx-4 -mt-8 sm:-mx-6 lg:-mx-10">
        {film.backdropPath && (
          <div aria-hidden className="relative h-56 overflow-hidden sm:h-80 lg:h-96">
            <Image
              src={`${TMDB_IMAGE_BASE}/w1280${film.backdropPath}`}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            {/* Üst kenar menüyle, yanlar ve alt sayfa karanlığıyla kaynaşır */}
            <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-background/50" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-background" />
          </div>
        )}

        {/* İçerik: backdrop varsa yukarı çekilip bandın üstüne taşar */}
        <div
          className={`relative mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-10 ${
            film.backdropPath ? "-mt-24 sm:-mt-36" : "pt-16"
          }`}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
        <div className="relative aspect-2/3 w-44 shrink-0 self-center overflow-hidden rounded-md bg-surface-2 shadow-2xl shadow-black/50 ring-1 ring-white/10 sm:w-64 sm:self-start">
          {film.posterPath ? (
            <Image
              src={`${TMDB_IMAGE_BASE}/w342${film.posterPath}`}
              alt={film.title}
              fill
              sizes="256px"
              priority
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center text-sm text-muted">
              {film.title}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <h1 className="text-3xl font-bold sm:text-4xl">
            {film.title}{" "}
            {film.releaseYear && (
              <span className="font-normal text-muted">
                ({film.releaseYear})
              </span>
            )}
          </h1>
          {film.originalTitle !== film.title && (
            <p className="text-sm text-muted">
              {t.originalTitle}: {film.originalTitle}
            </p>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            {film.genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-line bg-surface px-3 py-1"
              >
                {genre}
              </span>
            ))}
            {film.runtime && (
              <span className="rounded-full border border-line bg-surface px-3 py-1">
                {film.runtime} {t.minutes}
              </span>
            )}
            {typeof film.voteAverage === "number" && film.voteAverage > 0 && (
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-semibold text-amber-300">
                ★ {film.voteAverage.toFixed(1)}
              </span>
            )}
            {/* Resmî yaş sınırı: yetişkin sınıflandırması vurgulanır */}
            {film.certification && (
              <span
                title={`${film.certificationCountry}`}
                className={`rounded-full border px-3 py-1 font-bold ${
                  (film.minAge ?? 0) >= 18
                    ? "border-red-500/40 bg-red-500/10 text-red-300"
                    : "border-line bg-surface text-muted"
                }`}
              >
                {film.certification}
              </span>
            )}
          </div>
          {film.overview && (
            <p className="text-sm leading-relaxed text-muted">
              {film.overview}
            </p>
          )}
          {film.director && (
            <p className="text-sm">
              <span className="text-muted">{t.director}:</span> {film.director}
            </p>
          )}
          {film.cast && film.cast.length > 0 && (
            <p className="text-sm">
              <span className="text-muted">{t.cast}:</span>{" "}
              {film.cast.join(", ")}
            </p>
          )}
              <div className="flex flex-wrap gap-2 pt-1">
                <WatchlistToggle
                  tmdbId={tmdbId}
                  inList={inWatchlist}
                  variant="button"
                  addLabel={t.watchlist.add}
                  removeLabel={t.watchlist.remove}
                  inListLabel={t.watchlist.inList}
                />
                {/* Sayfanın altındaki değerlendirme formuna kestirme */}
                <a
                  href="#yorumlar"
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent active:scale-95"
                >
                  <span aria-hidden>💬</span> {t.comments.cta}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl space-y-8">
        {randomTier && (
          <div
            className={`flex flex-wrap items-center gap-3 rounded-md border p-4 ${
              randomTier === "ok"
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-amber-500/40 bg-amber-500/10"
            }`}
          >
            <span aria-hidden className="text-2xl">
              🎲
            </span>
            <p
              className={`min-w-0 flex-1 text-sm font-semibold ${
                randomTier === "ok" ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              {randomTier === "ok" ? t.randomPick.safe : t.randomPick.risky}
            </p>
            <a
              href="/rastgele"
              className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-bold text-black transition hover:opacity-90 active:scale-95"
            >
              {t.randomPick.reshuffle}
            </a>
          </div>
        )}
        <AnalysisPanel
          analysis={analysis}
          locale={locale}
          runtimeMinutes={film.runtime}
          personal={personal}
          community={community}
          minAge={film.minAge}
          certification={film.certification}
        />

        <CommentsSection
          tmdbId={tmdbId}
          locale={locale}
          hasAnalysis={analysis.status === "completed"}
        />
      </div>
    </div>
  );
}
