import type { FilmAnalysis } from "@/lib/types";
import { CONTENT_CATEGORIES } from "@/lib/types";
import {
  toVerifiedEvents,
  VERIFY_AT_NET,
  type SceneContribution,
} from "@/lib/contributions";
import { DICTIONARIES, SUBTITLE_LANG_NAMES, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { forcedTier } from "@/lib/known-titles";
import {
  computeCategoryScores,
  computeOverallRisk,
  isAgeFloored,
  isForcedVerdict,
  isPersonalized,
  needsVisualCaution,
  verdictTier,
  VERDICT_META,
  type SensitivityWeights,
} from "@/lib/score";
import { formatTimestamp } from "@/lib/format";
import AddSceneForm from "./AddSceneForm";
import AutoRefresh from "./AutoRefresh";
import RequestAnalysisButton from "./RequestAnalysisButton";
import SceneCommunityControls from "./SceneCommunityControls";

// Doğrulanmış durum renkleri (dataviz paleti) — her bar tek durum taşır ve
// yüzde etiketiyle birlikte görünür; renk hiçbir zaman tek başına anlam taşımaz.
function fillColor(score: number): string {
  if (score >= 67) return "#d03b3b";
  if (score >= 34) return "#fab219";
  return "#0ca30c";
}

const SEVERITY_CHIP = {
  1: "bg-emerald-500/15 text-emerald-300",
  2: "bg-amber-500/15 text-amber-300",
  3: "bg-red-500/15 text-red-300",
} as const;

interface Props {
  analysis: FilmAnalysis;
  locale: Locale;
  runtimeMinutes: number | null;
  // Ziyaretçinin hassasiyet profili; hüküm ve toplu risk buna göre hesaplanır
  personal?: SensitivityWeights;
  // Topluluk sahne katkıları (oy bilgisi görüntüleyene göre)
  community?: SceneContribution[];
  // Resmî yaş sınırı: hükme taban uygular ve "görsel sahne kaçmış olabilir"
  // uyarısını tetikler. Taban hesabı ülkeler arasındaki en katı sınırı
  // kullanır, rozette gösterilense ana ülkeninkidir.
  minAge?: number | null;
  certification?: string | null;
  strictestAge?: number | null;
  strictestCertification?: string | null;
  strictestCountry?: string | null;
  genreIds?: number[];
  director?: string | null;
}

export default function AnalysisPanel({
  analysis,
  locale,
  runtimeMinutes,
  personal,
  community = [],
  minAge,
  certification,
  strictestAge,
  strictestCertification,
  strictestCountry,
  genreIds,
  director,
}: Props) {
  const t = DICTIONARIES[locale];
  // Elle işaretlenmiş yapım: hüküm altyazı analizini beklemez
  const forced = forcedTier(analysis.tmdbId, director);
  const knownNote = (body: string) => (
    <div className="flex flex-wrap items-start gap-3 rounded-md border border-line bg-surface p-4 text-left">
      <span aria-hidden className="text-xl">
        📌
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold">{t.knownTitle.title}</p>
        <p className="text-xs leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );

  if (analysis.status !== "completed") {
    // Bu durumlarda işçi aktif çalışıyor: sayfa kendini tazeler, dönen halka gösterilir
    const inProgress = ["requested", "searching_subtitle", "analyzing"].includes(
      analysis.status
    );
    return (
      <section className="space-y-4">
        {/* İşaretli yapımda hüküm analizden bağımsız gösterilir; yüzde yok
            çünkü ortada hesaplanmış bir sahne dökümü yok */}
        {forced && (
          <div
            className="flex items-center gap-4 rounded-md border-2 p-5 text-left"
            style={{
              borderColor: VERDICT_META[forced].color,
              backgroundColor: `${VERDICT_META[forced].color}1a`,
            }}
          >
            <span className="text-4xl drop-shadow-lg sm:text-5xl" aria-hidden>
              {VERDICT_META[forced].emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold leading-tight sm:text-2xl">
                {t.verdicts[forced].title}
              </p>
              <p className="mt-1 text-sm text-muted">
                {t.verdicts[forced].subtitle}
              </p>
            </div>
          </div>
        )}
        {forced && knownNote(t.knownTitle.bodyNoScore)}
        <div className="rounded-md border border-line bg-surface p-6 text-center">
        <h2 className="mb-3 text-lg font-semibold">{t.analysisTitle}</h2>
        {analysis.status === "none" ? (
          <>
            <p className="mb-4 text-sm text-muted">{t.noAnalysis}</p>
            <RequestAnalysisButton
              tmdbId={analysis.tmdbId}
              label={t.requestAnalysis}
              pendingLabel={t.requestPending}
            />
          </>
        ) : inProgress ? (
          <>
            <AutoRefresh intervalMs={5000} />
            <div className="flex items-center justify-center gap-3 text-sm">
              <span
                aria-hidden
                className="inline-block size-4 animate-spin rounded-full border-2 border-line border-t-accent"
              />
              <span className="font-semibold">
                {t.statuses[analysis.status]}…
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">{t.requestedNote}</p>
          </>
        ) : analysis.status === "quota_exceeded" ||
          analysis.status === "worker_error" ? (
          <>
            {/* İkisi de otomatik yeniden denenir; sayfa açık kalırsa sonuç kendiliğinden gelir */}
            <AutoRefresh intervalMs={30000} />
            <p className="mx-auto max-w-xl rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              ⏳ {t.statuses[analysis.status]}
            </p>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">{t.statuses[analysis.status]}</p>
            {analysis.status === "subtitle_not_found" && (
              <RequestAnalysisButton
                tmdbId={analysis.tmdbId}
                label={t.retryAnalysis}
                pendingLabel={t.requestPending}
              />
            )}
          </>
        )}
        </div>
      </section>
    );
  }

  // Doğrulanmış topluluk sahneleri (net >= +1) skor hesabına katılır;
  // barlar ve toplu risk bunları da içerir. Doğrulanmamışlar yalnızca listede
  // görünür.
  const scoringAnalysis: FilmAnalysis = {
    ...analysis,
    events: [...analysis.events, ...toVerifiedEvents(community)],
  };

  const scores = computeCategoryScores(scoringAnalysis, runtimeMinutes);
  const overall = computeOverallRisk(scores, personal);
  const ageSignals = {
    tmdbId: analysis.tmdbId,
    director,
    minAge,
    strictestAge,
    genreIds,
  };
  const tier = verdictTier(overall, ageSignals);
  const ageFloored = isAgeFloored(overall, ageSignals);
  const visualCaution = needsVisualCaution(scores, ageSignals);
  const forcedApplied = isForcedVerdict(overall, ageSignals);
  // Hükmü belirleyen sınır rozettekinden katıysa (ör. US 13 / FR 16)
  // gerekçede o ülkeninki gösterilir, yoksa kullanıcı çelişki görür
  const drivingCert =
    (strictestAge ?? 0) > (minAge ?? 0) && strictestCertification
      ? { code: strictestCertification, country: strictestCountry }
      : { code: certification, country: null };
  const meta = VERDICT_META[tier];
  const verdict = t.verdicts[tier];
  const hours =
    (analysis.referenceRuntimeMinutes ?? runtimeMinutes ?? 120) / 60;
  const counts = new Map<string, number>();
  const points = new Map<string, number>();
  for (const e of scoringAnalysis.events) {
    counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    points.set(e.category, (points.get(e.category) ?? 0) + e.severity);
  }
  const sortedEvents = [...analysis.events].sort(
    (a, b) => a.startSeconds - b.startSeconds
  );

  return (
    <section className="space-y-6">
      <div
        className={`flex items-center gap-4 rounded-md border-2 p-5 ${
          tier === "never" ? "animate-pulse" : ""
        }`}
        style={{
          borderColor: meta.color,
          backgroundColor: `${meta.color}1a`,
          boxShadow: `0 0 60px ${meta.color}26`,
        }}
      >
        <span className="text-4xl drop-shadow-lg sm:text-5xl" aria-hidden>
          {meta.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold leading-tight sm:text-2xl">
            {verdict.title}
          </p>
          <p className="mt-1 text-sm text-muted">{verdict.subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className="text-3xl font-black tabular-nums sm:text-4xl"
            style={{ color: meta.color }}
          >
            {locale === "tr" ? `%${overall}` : `${overall}%`}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted">
            {t.overallRisk}
          </p>
        </div>
      </div>

      {/* Resmî yaş sınırı uyarısı: altyazı analizinin göremediği görsel
          sahneler için tek dış kanıt. Hüküm yükseltildiyse gerekçesi de
          burada yazar — kullanıcı neyin neden değiştiğini görsün. */}
      {/* Hüküm elle konan alt sınırdan geliyorsa yüzdeyle çelişkili
          görünmesin diye gerekçe hemen altta yazar */}
      {forcedApplied && <div className="-mt-2">{knownNote(t.knownTitle.body)}</div>}

      {/* Elle işaret devredeyken yaş gerekçesi fazlalık: hükmü zaten
          yukarıdaki not açıklıyor */}
      {!forcedApplied && (ageFloored || visualCaution) && drivingCert.code && (
        <div className="-mt-2 flex flex-wrap items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
          <span aria-hidden className="text-xl">
            🔞
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-amber-300">
              {drivingCert.country
                ? t.ageRating.titleCountry(drivingCert.code, drivingCert.country)
                : t.ageRating.title(drivingCert.code)}
            </p>
            <p className="text-xs leading-relaxed text-muted">
              {ageFloored ? t.ageRating.floored : t.ageRating.caution}
            </p>
          </div>
        </div>
      )}

      {isPersonalized(personal) && (
        <Link
          href="/profil"
          className="-mt-4 block text-right text-xs text-muted transition-colors hover:text-accent"
        >
          {t.personalizedNote}
        </Link>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t.contentSummary}</h2>
        <div className="space-y-3 rounded-md border border-line bg-surface p-4">
          {CONTENT_CATEGORIES.map((cat) => {
            const score = scores[cat];
            const count = counts.get(cat) ?? 0;
            const perHour =
              Math.round(((points.get(cat) ?? 0) / hours) * 10) / 10;
            return (
              <div
                key={cat}
                className="flex items-center gap-3"
                title={t.scenesTooltip(count, perHour)}
              >
                <span
                  className={`w-40 shrink-0 truncate text-sm sm:w-48 ${
                    score === 0 ? "text-muted" : ""
                  }`}
                >
                  {t.categories[cat]}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-[4px] bg-surface-2">
                  {score > 0 && (
                    <div
                      className="animate-grow h-full rounded-r-[4px]"
                      style={{
                        width: `${score}%`,
                        backgroundColor: fillColor(score),
                      }}
                    />
                  )}
                </div>
                <span
                  className={`w-12 shrink-0 text-right font-mono text-sm tabular-nums ${
                    score === 0 ? "text-muted" : "font-semibold"
                  }`}
                >
                  {locale === "tr" ? `%${score}` : `${score}%`}
                </span>
              </div>
            );
          })}
          <p className="border-t border-line pt-3 text-xs leading-relaxed text-muted">
            {t.scoreExplainer}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          {t.timestampedScenes}{" "}
          <span className="text-sm font-normal text-muted">
            ({sortedEvents.length} {t.records})
          </span>
        </h2>
        {/* Uzun listeyi kategori başına açılır-kapanır bölümlere ayır */}
        <div className="space-y-2">
          {CONTENT_CATEGORIES.map((cat) => {
            const catEvents = sortedEvents.filter((e) => e.category === cat);
            if (catEvents.length === 0) return null;
            return (
              <details
                key={cat}
                className="group rounded-md border border-line bg-surface"
              >
                <summary className="flex cursor-pointer select-none list-none items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
                  {t.categories[cat]}
                  <span className="text-xs font-normal text-muted">
                    ({catEvents.length})
                  </span>
                  <span
                    aria-hidden
                    className="ml-auto text-muted transition-transform duration-200 group-open:rotate-180"
                  >
                    ▾
                  </span>
                </summary>
                <ol className="space-y-2 border-t border-line p-3">
                  {catEvents.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-md border border-line bg-surface-2/50 p-4"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm text-accent">
                          {formatTimestamp(event.startSeconds)}–
                          {formatTimestamp(event.endSeconds)}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_CHIP[event.severity]}`}
                        >
                          {t.severities[event.severity]}
                        </span>
                      </div>
                      <p className="text-sm">{event.description[locale]}</p>
                      <p className="mt-1 text-xs text-muted">
                        {t.sources[event.source]}
                        {event.confidence !== null &&
                          ` — ${t.confidence(Math.round(event.confidence * 100))}`}
                        {event.verificationCount > 0 &&
                          ` — ${t.verifiedBy(event.verificationCount)}`}
                      </p>
                    </li>
                  ))}
                </ol>
              </details>
            );
          })}
        </div>
      </div>

      {/* Topluluk sahneleri: resmi listeden AYRI bölüm, mavi tonla ayrışır.
          Yeni eklenenler doğrulanana kadar hesaba katılmaz (trol koruması). */}
      <div className="rounded-md border border-sky-500/30 bg-sky-500/5 p-4">
        <h2 className="mb-1 text-lg font-semibold text-sky-300">
          👥 {t.community.sectionTitle}{" "}
          <span className="text-sm font-normal text-muted">
            ({community.length})
          </span>
        </h2>
        <p className="mb-3 text-xs leading-relaxed text-muted">
          {t.community.note}
        </p>
        <div className="mb-3">
          <AddSceneForm
            tmdbId={analysis.tmdbId}
            t={t.community}
            categoryLabels={t.categories}
            severityLabels={t.severities}
          />
        </div>
        {community.length > 0 && (
          <ol className="space-y-2">
            {community.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-sky-500/20 bg-surface/60 p-4"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-accent">
                    {formatTimestamp(c.startSeconds)}–
                    {formatTimestamp(c.endSeconds)}
                  </span>
                  <span className="rounded bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                    {t.categories[c.category]}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_CHIP[c.severity]}`}
                  >
                    {t.severities[c.severity]}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      c.net >= VERIFY_AT_NET
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-surface-2 text-muted"
                    }`}
                  >
                    {c.net >= VERIFY_AT_NET
                      ? t.community.verifiedChip
                      : t.community.pendingChip}
                  </span>
                </div>
                <p className="text-sm">{c.description}</p>
                <div className="mt-2">
                  <SceneCommunityControls
                    id={c.id}
                    up={c.up}
                    down={c.down}
                    myVote={c.myVote}
                    mine={c.mine}
                    t={{
                      voteUp: t.community.voteUp,
                      voteDown: t.community.voteDown,
                      delete: t.comments.delete,
                      deleteConfirm: t.comments.deleteConfirm,
                      deleteYes: t.comments.deleteYes,
                      cancel: t.comments.cancel,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {analysis.subtitleVersion && (
        <p className="rounded-md border border-line bg-surface p-3 text-xs text-muted">
          {t.versionNote(
            SUBTITLE_LANG_NAMES[locale][analysis.subtitleLanguage ?? "en"] ??
              analysis.subtitleLanguage ??
              "",
            analysis.subtitleVersion,
            analysis.referenceRuntimeMinutes
          )}
        </p>
      )}
    </section>
  );
}
