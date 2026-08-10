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
  sexual_dialogue: 6,
  sexual_implication: 8,
  explicit_sexual_content: 2.5,
  profanity: 30,
};

// Kategori risk ağırlıkları: her içerik aile yanında eşit utandırmaz.
// Öpüşme ve küfür hafif; cinsel konuşma/ima öpüşmeden daha utandırıcı
// (anlamamazlıktan gelmek gerekebilir); çıplaklık/seks sahnesi en yüksek.
// İleride kişisel hassasiyet profili bu ağırlıkları kullanıcıya göre değiştirecek.
export const RISK_WEIGHTS: Record<ContentCategory, number> = {
  short_kiss: 0.5,
  long_kiss: 0.8,
  sexual_dialogue: 1.3,
  sexual_implication: 1.1,
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

export function verdictTier(overall: number): VerdictTier {
  if (overall < 50) return "ok";
  if (overall < 70) return "risky";
  if (overall < 90) return "nope";
  return "never";
}

// Renkler doğrulanmış durum paletinden; emoji + başlıkla birlikte kullanılır,
// renk hiçbir zaman tek başına anlam taşımaz.
export const VERDICT_META: Record<VerdictTier, { emoji: string; color: string }> = {
  ok: { emoji: "🍿", color: "#0ca30c" },
  risky: { emoji: "😬", color: "#fab219" },
  nope: { emoji: "🚨", color: "#d03b3b" },
  never: { emoji: "☠️", color: "#d03b3b" },
};
