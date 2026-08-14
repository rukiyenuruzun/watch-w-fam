import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions";
import CommentsPreview from "@/components/CommentsPreview";
import FriendButton from "@/components/FriendButton";
import InviteLink from "@/components/InviteLink";
import FilmCard from "@/components/FilmCard";
import ProfileEditor from "@/components/ProfileEditor";
import { getCompletedAnalyses } from "@/lib/analysis";
import { displayName, getIdentity } from "@/lib/auth";
import { getCommentsByOwner } from "@/lib/comments";
import { getVerifiedEventsMap } from "@/lib/contributions";
import { getFriendIds, getIncomingRequests } from "@/lib/friends";
import { getSensitivity } from "@/lib/sensitivity";
import { DICTIONARIES } from "@/lib/i18n";
import { forcedTier } from "@/lib/known-titles";
import { getLocale } from "@/lib/locale";
import { getProfiles, type PublicProfile } from "@/lib/profiles";
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
// Yorumlarımda da başta yalnızca en yeni birkaçı görünür
const COMMENT_PREVIEW = 3;

// Arkadaş satırındaki ad + fotoğraf + profil bağlantısı
function PersonChip({
  profile,
  id,
  locale,
}: {
  profile: PublicProfile | undefined;
  id: string;
  locale: string;
}) {
  const name = profile?.displayName ?? "Anonim";
  return (
    <Link
      href={`/kisi/${id}`}
      className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80"
    >
      {profile?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt=""
          aria-hidden
          referrerPolicy="no-referrer"
          className="size-9 shrink-0 rounded-full object-cover ring-1 ring-line"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold"
        >
          {name.slice(0, 1).toLocaleUpperCase(locale)}
        </span>
      )}
      <span className="truncate text-sm font-semibold">{name}</span>
    </Link>
  );
}

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

  const [comments, watchlist, personal, friendIds, incomingIds] =
    await Promise.all([
      getCommentsByOwner(token),
      getWatchlist(token),
      getSensitivity(token),
      getFriendIds(user.id),
      getIncomingRequests(user.id),
    ]);
  // Arkadaşların ve istek gönderenlerin ad/fotoğrafı tek sorguda
  const people = await getProfiles([...friendIds, ...incomingIds]);

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

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined);
  const name = displayName(user);
  const friendLabels = {
    friends: t.friends.friends,
    remove: t.friends.remove,
    outgoing: t.friends.outgoing,
    cancel: t.friends.cancel,
    accept: t.friends.accept,
    reject: t.friends.reject,
  };

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
        {/* Çıkış üst menüden buraya taşındı; sayaçlar zaten aşağıdaki
            bölüm başlıklarında yazdığı için kartta tekrar edilmiyor */}
        <form action={signOutAction} className="ml-auto">
          <button
            type="submit"
            className="cursor-pointer rounded-md border border-line bg-surface-2 px-4 py-2 text-xs font-semibold text-muted transition hover:border-accent hover:text-accent active:scale-95"
          >
            {t.auth.signOut}
          </button>
        </form>
      </section>

      {/* Arkadaşlar */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {t.friends.title} ({friendIds.length})
        </h2>

        <div className="space-y-2 rounded-md border border-line bg-surface p-4">
          <p className="text-sm font-semibold">{t.friends.inviteTitle}</p>
          <p className="text-xs leading-relaxed text-muted">
            {t.friends.inviteNote}
          </p>
          <InviteLink
            path={`/davet/${user.id}`}
            copyLabel={t.friends.copyLink}
            copiedLabel={t.friends.copied}
          />
        </div>

        {incomingIds.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-accent">
              {t.friends.requests} ({incomingIds.length})
            </h3>
            <ul className="space-y-2">
              {incomingIds.map((fid) => (
                <li
                  key={fid}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-accent/30 bg-accent/5 p-3"
                >
                  <PersonChip
                    profile={people.get(fid)}
                    id={fid}
                    locale={locale}
                  />
                  <FriendButton
                    otherId={fid}
                    status="incoming"
                    labels={friendLabels}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {friendIds.length === 0 ? (
          <p className="rounded-md border border-line bg-surface p-5 text-center text-sm text-muted">
            {t.friends.empty}
          </p>
        ) : (
          <ul className="space-y-2">
            {friendIds.map((fid) => (
              <li
                key={fid}
                className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface p-3"
              >
                <PersonChip profile={people.get(fid)} id={fid} locale={locale} />
              </li>
            ))}
          </ul>
        )}
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
          <CommentsPreview
            previewCount={COMMENT_PREVIEW}
            listClassName="space-y-3"
            showAllLabel={t.comments.showAll(comments.length)}
            showLessLabel={t.comments.showLess}
          >
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
          </CommentsPreview>
        )}
      </section>
    </div>
  );
}
