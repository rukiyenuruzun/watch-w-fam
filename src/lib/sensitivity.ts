import type { ContentCategory } from "./types";
import { CONTENT_CATEGORIES } from "./types";
import type { SensitivityWeights } from "./score";
import { getSupabase } from "./supabase";

// Kişisel hassasiyet profili: kimlik başına (girişli kullanıcı ya da anonim
// çerez) kategori→çarpan haritası. İzleme listesiyle aynı kimlik modeli;
// girişte mergeAnonData anonim profili hesaba taşır.

export const SENSITIVITY_LEVELS = [0, 1, 1.5, 2] as const;
export type SensitivityLevel = (typeof SENSITIVITY_LEVELS)[number];

function sanitize(raw: unknown): SensitivityWeights {
  const out: SensitivityWeights = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const cat of CONTENT_CATEGORIES) {
    const v = (raw as Record<string, unknown>)[cat];
    if (typeof v === "number" && (SENSITIVITY_LEVELS as readonly number[]).includes(v)) {
      out[cat] = v;
    }
  }
  return out;
}

export async function getSensitivity(
  token: string | undefined
): Promise<SensitivityWeights> {
  if (!token) return {};
  const { data, error } = await getSupabase()
    .from("sensitivity_profiles")
    .select("weights")
    .eq("token", token)
    .maybeSingle();
  // Tablo henüz kurulmamışsa (ya da geçici hata) site varsayılan ağırlıklarla
  // çalışmaya devam etsin — profil özelliği sessizce devre dışı kalır
  if (error) return {};
  return sanitize(data?.weights);
}

export async function setSensitivity(
  token: string,
  category: ContentCategory,
  level: SensitivityLevel
): Promise<void> {
  const sb = getSupabase();
  const current = await getSensitivity(token);
  const weights: SensitivityWeights = { ...current, [category]: level };
  // "Normal" (1) varsayılan olduğundan saklamaya gerek yok; kayıt sade kalır
  if (level === 1) delete weights[category];
  const { error } = await sb
    .from("sensitivity_profiles")
    .upsert(
      { token, weights, updated_at: new Date().toISOString() },
      { onConflict: "token" }
    );
  if (error) throw new Error(`Hassasiyet profili kaydedilemedi: ${error.message}`);
}
