import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions";
import FilmCard from "@/components/FilmCard";
import ProfileEditor from "@/components/ProfileEditor";
import SensitivityEditor from "@/components/SensitivityEditor";
import { getCompletedAnalyses } from "@/lib/analysis";
import { displayName, getIdentity } from "@/lib/auth";
import { getCommentsByOwner } from "@/lib/comments";
import { getVerifiedEventsMap } from "@/lib/contributions";
import { getSensitivity } from "@/lib/sensitivity";
import { DICTIONARIES } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import {
  computeCategoryScores,
  computeOverallRisk,
  verdictTier,
  VERDICT_META,
} from "@/lib/score";
import { getFilm } from "@/lib/tmdb";
import type { Film } from "@/lib/types";
import { getWatchlist } from "@/lib/watchlist";

// Profilde izleme listesinin yalnızca son eklenenleri gösterilir; tamamı /listem'de
const WATCHLIST_PREVIEW = 4;

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(
    locale === "tr" ? "tr-TR" : "en-US",
    { day: "numeric", month: "long", year: "numeric" }
  );
}

export default async function ProfilePage() {
  const { token, user } = await getIdentity();
  // Profil hesaba bağlı bir sayfa; girişsiz ziyaretçi giriş sayfasına gider
  if (!user || !token) redirect("/giris");

  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  const p = t.profile;

  const [comments, watchlist, personal] = await Promise.all([
    getCommentsByOwner(token),
    getWatchlist(token),
    getSensitivity(token),
  ]);

  // Yorum yapılan filmlerin başlıkları + listedeki ilk birkaç filmin kartı
  const previewEntries = watchlist.slice(0, WATCHLIST_PREVIEW);
  const commentFilmIds = [...new Set(comments.map((c) => c.tmdbId))];
  const films = new Map<number, Film | null>();
  await Promise.all(
    [...new Set([...commentFilmIds, ...previewEntries.map((e) => e.tmdbId)])].map(
      async (id) => {
        films.set(id, await getFilm(id, locale));
      }
    )
  );

  const previewFilms = previewEntries
    .map((e) => films.get(e.tmdbId))
    .filter((f): f is Film => Boolean(f));
  const badges = new Map<number, { emoji: string; label: string }>();
  const previewIds = previewFilms.map((f) => f.tmdbId);
  const [analyses, extras] = await Promise.all([
    getCompletedAnalyses(previewIds),
    getVerifiedEventsMap(previewIds),
  ]);
  for (const film of previewFilms) {
    const analysis = analyses.get(film.tmdbId);
    if (!analysis) continue;
    const extra = extras.get(film.tmdbId);
    const merged = extra
      ? { ...analysis, events: [...analysis.events, ...extra] }
      : analysis;
    const tier = verdictTier(
      computeOverallRisk(computeCategoryScores(merged, film.runtime), personal),
      film.minAge
    );
    badges.set(film.tmdbId, {
      emoji: VERDICT_META[tier].emoji,
      label: t.verdicts[tier].title,
    });
  }

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined);
  const name = displayName(user);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* Hesap kartı */}
      <section className="flex flex-wrap items-center gap-4 rounded-md border border-line bg-surface p-5">
        <ProfileEditor
          name={name}
          avatarUrl={avatarUrl}
          initial={name.slice(0, 1).toLocaleUpperCase(locale)}
          labels={{
            editName: p.editName,
            changePhoto: p.changePhoto,
            photoTooBig: p.photoTooBig,
            save: t.comments.save,
            cancel: t.comments.cancel,
          }}
        >
          {user.email && (
            <p className="truncate text-sm text-muted">{user.email}</p>
          )}
          {user.created_at && (
            <p className="mt-0.5 text-xs text-muted">
              {p.memberSince(formatDate(user.created_at, locale))}
            </p>
          )}
        </ProfileEditor>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-muted">
            {p.statComments(comments.length)} · {p.statFilms(watchlist.length)}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-xs text-muted underline transition-colors hover:text-accent"
            >
              {t.auth.signOut}
            </button>
          </form>
        </div>
      </section>

      {/* Hassasiyet profili */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
          {p.sensitivityTitle}
        </h2>
        <p className="mb-3 text-xs leading-relaxed text-muted">
          {p.sensitivityNote}
        </p>
        <SensitivityEditor
          weights={personal}
          categoryLabels={t.categories}
          levelLabels={p.sensitivityLevels}
        />
      </section>

      {/* İzleme listesi önizlemesi */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {t.watchlist.title} ({watchlist.length})
          </h2>
          {watchlist.length > 0 && (
            <Link
              href="/listem"
              className="text-xs font-semibold text-muted transition-colors hover:text-accent"
            >
              {p.seeAll}
            </Link>
          )}
        </div>
        {previewFilms.length === 0 ? (
          <p className="rounded-md border border-line bg-surface p-5 text-center text-sm text-muted">
            {t.watchlist.empty}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {previewFilms.map((film) => (
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
      </section>

      {/* Yorumlar */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {p.commentsTitle} ({comments.length})
        </h2>
        {comments.length === 0 ? (
          <p className="rounded-md border border-line bg-surface p-5 text-center text-sm text-muted">
            {p.commentsEmpty}
          </p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => {
              const film = films.get(c.tmdbId);
              return (
                <li
                  key={c.id}
                  className="rounded-md border border-line bg-surface p-4"
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <Link
                      href={`/film/${c.tmdbId}#yorumlar`}
                      className="text-sm font-semibold transition-colors hover:text-accent"
                    >
                      🎬 {film?.title ?? `tmdb:${c.tmdbId}`}
                    </Link>
                    <span className="text-muted">
                      {formatDate(c.createdAt, locale)}
                      {c.updatedAt && ` · ${t.comments.edited}`}
                    </span>
                    {c.liked !== null && (
                      <span aria-hidden>{c.liked ? "👍" : "👎"}</span>
                    )}
                    {c.riskVote && (
                      <span className="rounded bg-surface-2 px-2 py-0.5 text-muted">
                        {c.riskVote === "lower"
                          ? t.comments.voteLower
                          : c.riskVote === "correct"
                            ? t.comments.voteCorrect
                            : t.comments.voteHigher}
                      </span>
                    )}
                  </div>
                  {c.text && <p className="text-sm leading-relaxed">{c.text}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
