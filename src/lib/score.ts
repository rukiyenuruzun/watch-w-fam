import type { ContentCategory, FilmAnalysis } from "./types";

// ── Taslak puan formülü ───────────────────────────────────────────────
//
// Kategori barları TARAFSIZ yoğunluk gösterir (ağırlıksız):
//
//   yük      = Σ şiddet          (her olay 1–3 puan katar)
//   yoğunluk = yük / film süresi (saat başına puan → uzun film cezalanmaz)
//   yüzde    = min(100, 100 × yoğunluk / doyma_noktası)
//
// Toplu risk ise kategori ağırlıklarıyla hesaplanır (aşağıda).
// AŞAĞIDAKİ DEĞERLER TASLAKTIR — gerçek verilerle birlikte ayarlanacak.

// Saat başına şiddet puanı cinsinden %100 eşiği.
// Örn. explicit_sexual_content 2.5 → saatte tek orta şiddetli açık sahne
// bile %80'e çıkar; profanity 30 → küfür ancak çok yoğunsa yükselir.
export const SATURATION_PER_HOUR: Record<ContentCategory, number> = {
  short_kiss: 6,
  long_kiss: 4,
  // Konuşma kategorileri bilerek geniş: bir aşk filminde saatte bir iki kez
  // seksten söz edilmesi barı doldurmamalı, ancak konuşma gerçekten yoğun
  // olduğunda (sex komedileri) yükselmeli. Arşiv ölçümü: aşk filmleri
  // 1–3 puan/saat, seks komedileri 25–50 puan/saat bandında.
  sexual_dialogue: 20,
  sexual_implication: 12,
  explicit_sexual_content: 2.5,
  profanity: 30,
};

// Kategori risk ağırlıkları: her içerik aile yanında eşit utandırmaz.
// Öpüşme ve küfür hafif; sahnenin kendisi (çıplaklık/seks) en yüksek.
// Konuşmak sahneyi görmekten hafiftir: "seksten söz edildi" ile "seks
// sahnesi var" aynı kefeye konmaz — ağırlıklar uzun öpüşmeyle aynı bantta.
// Kişisel hassasiyet profili bu ağırlıkları kullanıcıya göre çarpar.
export const RISK_WEIGHTS: Record<ContentCategory, number> = {
  short_kiss: 0.5,
  long_kiss: 0.8,
  sexual_dialogue: 1.0,
  sexual_implication: 0.6,
  explicit_sexual_content: 2.2,
  profanity: 0.4,
};

export function computeCategoryScores(
  analysis: FilmAnalysis,
  runtimeMinutes: number | null
): Record<ContentCategory, number> {
  const hours = (analysis.referenceRuntimeMinutes ?? runtimeMinutes ?? 120) / 60;
  const load = {} as Record<ContentCategory, number>;
  for (const cat of Object.keys(SATURATION_PER_HOUR) as ContentCategory[]) {
    load[cat] = 0;
  }
  for (const e of analysis.events) {
    load[e.category] += e.severity;
  }

  const scores = {} as Record<ContentCategory, number>;
  for (const cat of Object.keys(load) as ContentCategory[]) {
    const density = load[cat] / hours;
    scores[cat] = Math.min(
      100,
      Math.round((100 * density) / SATURATION_PER_HOUR[cat])
    );
  }
  return scores;
}

// Kişisel hassasiyet profili: kategori başına ağırlık çarpanı.
// 0 = önemsemem (hesaptan çıkar), 1 = normal, 1.5 = hassas, 2 = çok hassas.
export type SensitivityWeights = Partial<Record<ContentCategory, number>>;

// Toplu risk: kategoriler bağımsız utanç kaynakları gibi birleştirilir
// (olasılıksal VEYA: 1 − Π(1 − risk)). Böylece tek yüksek kategori tek
// başına belirleyici olur, birden çok orta kategori de birikerek yükseltir.
// Ortalama almıyoruz çünkü tek bir seks sahnesini beş masum kategori "sulandırmamalı".
// Kişisel çarpan taban ağırlığı ölçekler; formül gereği ek normalizasyon gerekmez
// (tüm çarpanlar 0 ise risk 0 çıkar — "hiçbiri umurumda değil" tam da bu demek).
export function computeOverallRisk(
  scores: Record<ContentCategory, number>,
  personal?: SensitivityWeights
): number {
  let comfort = 1;
  for (const cat of Object.keys(scores) as ContentCategory[]) {
    const weight = RISK_WEIGHTS[cat] * (personal?.[cat] ?? 1);
    const risk = Math.min(1, (weight * scores[cat]) / 100);
    comfort *= 1 - risk;
  }
  return Math.round(100 * (1 - comfort));
}

// Profil varsayılandan sapıyor mu? ("sana göre hesaplandı" notu için)
export function isPersonalized(personal?: SensitivityWeights): boolean {
  return Object.values(personal ?? {}).some((m) => m !== undefined && m !== 1);
}

// Hüküm eşikleri: <50 izlenir (aile çok katı değilse), 50–69 riskli,
// 70–89 izlenmez, ≥90 hayatta izlenmez (Euphoria / Gaspar Noé ligi).
export type VerdictTier = "ok" | "risky" | "nope" | "never";

// Resmî yaş sınırı bu yaştan büyükse "aileyle izlenir" denmez
export const ADULT_MIN_AGE = 18;
// Bu yaştan itibaren analizin eksik kalmış olabileceği uyarısı düşünülür
export const CAUTION_MIN_AGE = 16;

export function verdictTier(
  overall: number,
  minAge?: number | null
): VerdictTier {
  const tier: VerdictTier =
    overall < 50 ? "ok" : overall < 70 ? "risky" : overall < 90 ? "nope" : "never";
  // Analiz altyazıya dayanır ve sessiz sahneleri göremez; yapımın resmî
  // yaş sınırı 18+ ise "aileyle izlenir" hükmü verilmez, en az "riskli"
  // sayılır (yüzde olduğu gibi kalır, gerekçe arayüzde yazılır).
  if (tier === "ok" && (minAge ?? 0) >= ADULT_MIN_AGE) return "risky";
  return tier;
}

// Hüküm yaş sınırı yüzünden mi yükseltildi? (arayüzde gerekçe göstermek için)
export function isAgeFloored(overall: number, minAge?: number | null): boolean {
  return overall < 50 && (minAge ?? 0) >= ADULT_MIN_AGE;
}

// "Resmî sınır yetişkin diyor ama analiz neredeyse temiz" durumu: altyazıda
// konuşulmayan görsel sahneler kaçmış olabilir, kullanıcı uyarılmalı.
export function needsVisualCaution(
  scores: Record<ContentCategory, number>,
  minAge?: number | null
): boolean {
  if ((minAge ?? 0) < CAUTION_MIN_AGE) return false;
  const sexual =
    scores.sexual_dialogue +
    scores.sexual_implication +
    scores.explicit_sexual_content;
  return sexual < 60;
}

// Renkler doğrulanmış durum paletinden; emoji + başlıkla birlikte kullanılır,
// renk hiçbir zaman tek başına anlam taşımaz.
export const VERDICT_META: Record<VerdictTier, { emoji: string; color: string }> = {
  ok: { emoji: "🍿", color: "#0ca30c" },
  risky: { emoji: "😬", color: "#fab219" },
  nope: { emoji: "🚨", color: "#d03b3b" },
  never: { emoji: "☠️", color: "#d03b3b" },
};
