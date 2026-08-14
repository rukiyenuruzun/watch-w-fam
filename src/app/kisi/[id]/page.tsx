import Link from "next/link";
import { notFound } from "next/navigation";
import CommentsPreview from "@/components/CommentsPreview";
import FilmCard from "@/components/FilmCard";
import FriendButton from "@/components/FriendButton";
import { getCompletedAnalyses } from "@/lib/analysis";
import { getIdentity } from "@/lib/auth";
import { getCommentsByOwner } from "@/lib/comments";
import { getVerifiedEventsMap } from "@/lib/contributions";
import { getFriendStatus } from "@/lib/friends";
import { DICTIONARIES } from "@/lib/i18n";
import { forcedTier } from "@/lib/known-titles";
import { getLocale } from "@/lib/locale";
import { getProfile } from "@/lib/profiles";
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

const WATCHLIST_PREVIEW = 8;
const COMMENT_PREVIEW = 3;

// Herkese açık profil. Hassasiyet profili BURADA GÖSTERİLMEZ — o kişiye
// özel ve ayarlar sayfasında durur.
export default async function PersonPage({
  params,
}: PageProps<"/kisi/[id]">) {
  const { id } = await params;
  const locale = await getLocale();
  const t = DICTIONARIES[locale];

  const profile = await getProfile(id);
  if (!profile) notFound();

  const { token: myToken, user } = await getIdentity();
  // Kendi sayfam ise düzenlenebilir profile yönlendirmek yerine aynı
  // görünümü gösteriyoruz; arkadaşlık düğmesi çıkmaz
  const status = user ? await getFriendStatus(user.id, id) : "none";

  const [comments, watchlist, myPersonal] = await Promise.all([
    getCommentsByOwner(id),
    getWatchlist(id),
    // Rozetler SAYFAYI GÖRENİN hassasiyetine göre hesaplanır: "bana göre
    // riskli mi" sorusu ziyaretçinin sorusudur, listenin sahibinin değil
    getSensitivity(myToken),
  ]);

  const previewEntries = watchlist.slice(0, WATCHLIST_PREVIEW);
  const commentFilmIds = [...new Set(comments.map((c) => c.tmdbId))];
  const films = new Map<number, Film | null>();
  await Promise.all(
    [...new Set([...commentFilmIds, ...previewEntries.map((e) => e.tmdbId)])].map(
      async (fid) => {
        films.set(fid, await getFilm(fid, locale));
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
    if (!analysis) {
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
      computeOverallRisk(computeCategoryScores(merged, film.runtime), myPersonal),
      film
    );
    badges.set(film.tmdbId, {
      emoji: VERDICT_META[tier].emoji,
      label: t.verdicts[tier].title,
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <section className="flex flex-wrap items-center gap-4 rounded-md border border-line bg-surface p-5">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            aria-hidden
            referrerPolicy="no-referrer"
            className="size-16 shrink-0 rounded-full object-cover ring-1 ring-line"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-16 shrink-0 place-items-center rounded-full bg-surface-2 text-xl font-bold"
          >
            {profile.displayName.slice(0, 1).toLocaleUpperCase(locale)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{profile.displayName}</h1>
          <p className="mt-0.5 text-xs text-muted">
            {t.friends.stats(comments.length, watchlist.length)}
          </p>
        </div>
        {user && user.id !== id && (
          <FriendButton
            otherId={id}
            status={status}
            labels={{
              friends: t.friends.friends,
              remove: t.friends.remove,
              outgoing: t.friends.outgoing,
              cancel: t.friends.cancel,
              accept: t.friends.accept,
              reject: t.friends.reject,
            }}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {t.watchlist.title} ({watchlist.length})
        </h2>
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
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {t.friends.theirComments} ({comments.length})
        </h2>
        {comments.length === 0 ? (
          <p className="rounded-md border border-line bg-surface p-5 text-center text-sm text-muted">
            {t.comments.empty}
          </p>
        ) : (
          <CommentsPreview
            previewCount={COMMENT_PREVIEW}
            listClassName="space-y-3"
            showAllLabel={t.comments.showAll(comments.length)}
            showLessLabel={t.comments.showLess}
          >
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-line bg-surface p-4"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <Link
                    href={`/film/${c.tmdbId}#yorumlar`}
                    className="text-sm font-semibold transition-colors hover:text-accent"
                  >
                    🎬 {films.get(c.tmdbId)?.title ?? `tmdb:${c.tmdbId}`}
                  </Link>
                  {c.liked !== null && (
                    <span aria-hidden>{c.liked ? "👍" : "👎"}</span>
                  )}
                </div>
                {c.text && <p className="text-sm leading-relaxed">{c.text}</p>}
              </li>
            ))}
          </CommentsPreview>
        )}
      </section>
    </div>
  );
}
