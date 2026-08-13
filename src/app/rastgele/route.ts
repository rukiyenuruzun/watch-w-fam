import { redirect } from "next/navigation";
import {
  getAnalyzedIds,
  getCompletedAnalyses,
} from "@/lib/analysis";
import { getIdentity } from "@/lib/auth";
import { getVerifiedEventsMap } from "@/lib/contributions";
import { getLocale } from "@/lib/locale";
import {
  computeCategoryScores,
  computeOverallRisk,
  verdictTier,
} from "@/lib/score";
import { getSensitivity } from "@/lib/sensitivity";
import { getFilm } from "@/lib/tmdb";
import type { Film } from "@/lib/types";

// "Rastgele güvenli film": analizli filmler içinden, ziyaretçinin hassasiyet
// profiliyle hesaplanan hükmü "izlenir" ya da "riskli" olanlardan birini seçip
// film sayfasına yönlendirir. Yani "güvenli" tanımı kişiye özeldir.
export async function GET() {
  const locale = await getLocale();
  const { token } = await getIdentity();
  const [personal, ids] = await Promise.all([
    getSensitivity(token),
    getAnalyzedIds(),
  ]);

  const [films, analyses, extras] = await Promise.all([
    Promise.all(ids.map((id) => getFilm(id, locale))),
    getCompletedAnalyses(ids),
    getVerifiedEventsMap(ids),
  ]);

  const eligible: number[] = [];
  for (const film of films) {
    if (!film) continue;
    const analysis = analyses.get(film.tmdbId);
    if (!analysis) continue;
    const extra = extras.get(film.tmdbId);
    const merged = extra
      ? { ...analysis, events: [...analysis.events, ...extra] }
      : analysis;
    const tier = verdictTier(
      computeOverallRisk(
        computeCategoryScores(merged, (film as Film).runtime),
        personal
      ),
      (film as Film).minAge
    );
    if (tier === "ok" || tier === "risky") eligible.push(film.tmdbId);
  }

  // Uygun film yoksa (çok katı profil ya da boş arşiv) ana sayfaya dön
  if (eligible.length === 0) redirect("/");
  // rastgele=1: film sayfası "şansına bu çıktı" bandını ve yeniden karıştırma
  // düğmesini bu işaretle gösterir
  const pick = eligible[Math.floor(Math.random() * eligible.length)];
  redirect(`/film/${pick}?rastgele=1`);
}
