import { addCommentAction } from "@/app/actions";
import CommentItem from "@/components/CommentItem";
import CommentsPreview from "@/components/CommentsPreview";
import { getIdentity } from "@/lib/auth";
import { getComments } from "@/lib/comments";
import { DICTIONARIES, type Locale } from "@/lib/i18n";
import type { RiskVote } from "@/lib/types";

interface Props {
  tmdbId: number;
  locale: Locale;
  hasAnalysis: boolean; // "% doğru mu" oyu yalnızca analizli filmlerde sorulur
  friendIds?: string[]; // arkadaşların yorumları listenin başına alınır
}

// Değerlendirmelerin başta yalnızca en yenileri görünür
const COMMENT_PREVIEW = 3;

const VOTE_COLORS: Record<RiskVote, string> = {
  lower: "#0ca30c",
  correct: "#9ab",
  higher: "#d03b3b",
};

export default async function CommentsSection({
  tmdbId,
  locale,
  hasAnalysis,
  friendIds = [],
}: Props) {
  const t = DICTIONARIES[locale].comments;
  const all = await getComments(tmdbId);
  // Arkadaşının görüşü yabancınınkinden önce gelir; her iki grup kendi
  // içinde yeniden eskiye sıralı kalır (getComments zaten öyle döndürüyor)
  const friends = new Set(friendIds);
  const isFriend = (ownerToken?: string) =>
    Boolean(ownerToken && friends.has(ownerToken));
  const comments = [
    ...all.filter((c) => isFriend(c.ownerToken)),
    ...all.filter((c) => !isFriend(c.ownerToken)),
  ];
  // Ziyaretçinin kimliği (girişliyse hesap, değilse anonim çerez);
  // kendi yorumlarında düzenle/sil çıkar
  const { token: myToken, user } = await getIdentity();

  const voteCounts: Record<RiskVote, number> = { lower: 0, correct: 0, higher: 0 };
  for (const c of comments) {
    if (c.riskVote) voteCounts[c.riskVote] += 1;
  }
  const totalVotes = voteCounts.lower + voteCounts.correct + voteCounts.higher;
  const voteLabels: Record<RiskVote, string> = {
    lower: t.voteLower,
    correct: t.voteCorrect,
    higher: t.voteHigher,
  };

  return (
    // "Yorum yaz" kestirmesinin hedefi; scroll-mt yapışkan menü payı
    <section id="yorumlar" className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-semibold">
        {t.title}{" "}
        {comments.length > 0 && (
          <span className="text-sm font-normal text-muted">({comments.length})</span>
        )}
      </h2>

      {hasAnalysis && totalVotes > 0 && (
        <div className="space-y-2 rounded-md border border-line bg-surface p-4">
          <p className="text-sm font-semibold">{t.voteSummary}</p>
          {(Object.keys(voteCounts) as RiskVote[]).map((vote) => {
            const count = voteCounts[vote];
            const pct = Math.round((count / totalVotes) * 100);
            return (
              <div key={vote} className="flex items-center gap-3 text-xs">
                <span className={`w-36 shrink-0 sm:w-44 ${count === 0 ? "text-muted" : ""}`}>
                  {voteLabels[vote]}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-[4px] bg-surface-2">
                  {count > 0 && (
                    <div
                      className="h-full rounded-r-[4px]"
                      style={{ width: `${pct}%`, backgroundColor: VOTE_COLORS[vote] }}
                    />
                  )}
                </div>
                <span className="w-8 shrink-0 text-right font-mono tabular-nums">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {comments.length === 0 ? (
        <p className="rounded-md border border-line bg-surface p-4 text-sm text-muted">
          {t.empty}
        </p>
      ) : (
        <CommentsPreview
          previewCount={COMMENT_PREVIEW}
          showAllLabel={t.showAll(comments.length)}
          showLessLabel={t.showLess}
        >
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              id={c.id}
              tmdbId={tmdbId}
              name={c.name}
              text={c.text}
              liked={c.liked}
              riskVote={c.riskVote}
              dateLabel={new Date(c.createdAt).toLocaleDateString(
                locale === "tr" ? "tr-TR" : "en-US",
                { year: "numeric", month: "short", day: "numeric" }
              )}
              isEdited={Boolean(c.updatedAt)}
              isOwner={Boolean(myToken && c.ownerToken === myToken)}
              hasAnalysis={hasAnalysis}
              t={{
                anonymous: t.anonymous,
                edit: t.edit,
                delete: t.delete,
                deleteConfirm: t.deleteConfirm,
                deleteYes: t.deleteYes,
                cancel: t.cancel,
                save: t.save,
                edited: t.edited,
                nameLabel: t.nameLabel,
                likedLabel: t.likedLabel,
                likedYes: t.likedYes,
                likedNo: t.likedNo,
                voteLabel: t.voteLabel,
                textLabel: t.textLabel,
                voteLabels,
              }}
            />
          ))}
        </CommentsPreview>
      )}

      <form
        action={addCommentAction}
        className="space-y-3 rounded-md border border-line bg-surface p-4"
      >
        <h3 className="text-sm font-semibold">{t.formTitle}</h3>
        <input type="hidden" name="tmdbId" value={tmdbId} />

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Girişli kullanıcının adı hesabından gelir; alan gösterilmez */}
          {!user && (
            <label className="block">
              <span className="mb-1 block text-xs text-muted">{t.nameLabel}</span>
              <input
                type="text"
                name="name"
                maxLength={40}
                className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
          )}
          <fieldset>
            <legend className="mb-1 text-xs text-muted">{t.likedLabel}</legend>
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" name="liked" value="yes" className="accent-(--accent)" />
                {t.likedYes}
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="liked" value="no" className="accent-(--accent)" />
                {t.likedNo}
              </label>
            </div>
          </fieldset>
        </div>

        {hasAnalysis && (
          <fieldset>
            <legend className="mb-1 text-xs text-muted">{t.voteLabel}</legend>
            <div className="flex flex-wrap gap-3 text-sm">
              {(["lower", "correct", "higher"] as const).map((vote) => (
                <label key={vote} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="riskVote"
                    value={vote}
                    className="accent-(--accent)"
                  />
                  {voteLabels[vote]}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <label className="block">
          <span className="mb-1 block text-xs text-muted">{t.textLabel}</span>
          <textarea
            name="text"
            rows={3}
            maxLength={1000}
            placeholder={t.textPlaceholder}
            className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
          />
        </label>

        <button
          type="submit"
          className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:opacity-90 active:scale-95"
        >
          {t.submit}
        </button>
      </form>
    </section>
  );
}
