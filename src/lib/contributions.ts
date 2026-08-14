import type { ContentCategory, ContentEvent } from "./types";
import { getSupabase } from "./supabase";

// Topluluk sahne katkıları: altyazı analizinin kaçırdığı (çoğu görsel)
// sahneleri kullanıcılar ekler, diğerleri 👍/👎 ile doğrular.
// net >= VERIFY_AT_NET olan katkılar risk hesabına katılır;
// net <= HIDE_BELOW_NET olanlar listeden tamamen düşer.

export const VERIFY_AT_NET = 1;
export const HIDE_BELOW_NET = -3;

export interface SceneContribution {
  id: string;
  tmdbId: number;
  category: ContentCategory;
  severity: 1 | 2 | 3;
  startSeconds: number;
  endSeconds: number;
  description: string;
  createdAt: string;
  up: number;
  down: number;
  net: number; // up - down
  // Arkadaşının eklediği sahne oy beklemeden güvenilir sayılır
  byFriend: boolean;
  myVote: -1 | 0 | 1; // görüntüleyenin oyu
  mine: boolean; // görüntüleyen eklemiş mi (silme yetkisi)
}

interface ContributionRow {
  id: string;
  tmdb_id: number;
  category: ContentCategory;
  severity: number;
  start_seconds: number;
  end_seconds: number;
  description: string;
  owner_token: string | null;
  created_at: string;
}

export async function getContributions(
  tmdbId: number,
  viewerToken: string | undefined,
  // Girişli ziyaretçinin arkadaşları; onların katkıları oy beklemez
  friendIds: string[] = []
): Promise<SceneContribution[]> {
  const friends = new Set(friendIds);
  const sb = getSupabase();
  const { data: rows, error } = await sb
    .from("scene_contributions")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .order("start_seconds", { ascending: true });
  // Tablo henüz kurulmamışsa özellik sessizce devre dışı kalır
  if (error || !rows || rows.length === 0) return [];

  const { data: votes } = await sb
    .from("scene_votes")
    .select("contribution_id, token, value")
    .in(
      "contribution_id",
      (rows as ContributionRow[]).map((r) => r.id)
    );

  const tally = new Map<string, { up: number; down: number; my: -1 | 0 | 1 }>();
  for (const v of votes ?? []) {
    const t = tally.get(v.contribution_id) ?? { up: 0, down: 0, my: 0 as const };
    if (v.value > 0) t.up += 1;
    else t.down += 1;
    if (viewerToken && v.token === viewerToken) t.my = v.value > 0 ? 1 : -1;
    tally.set(v.contribution_id, t);
  }

  return (rows as ContributionRow[])
    .map((r) => {
      const t = tally.get(r.id) ?? { up: 0, down: 0, my: 0 as const };
      return {
        id: r.id,
        tmdbId: r.tmdb_id,
        category: r.category,
        severity: Math.min(3, Math.max(1, r.severity)) as 1 | 2 | 3,
        startSeconds: r.start_seconds,
        endSeconds: r.end_seconds,
        description: r.description,
        createdAt: r.created_at,
        up: t.up,
        down: t.down,
        net: t.up - t.down,
        myVote: t.my,
        mine: Boolean(viewerToken && r.owner_token === viewerToken),
        byFriend: Boolean(r.owner_token && friends.has(r.owner_token)),
      };
    })
    .filter((c) => c.net > HIDE_BELOW_NET);
}

// Doğrulanmış katkıları skor birleşimine hazır ContentEvent biçimine çevirir
// (film sayfası ve analiz paneli aynı dönüşümü paylaşır)
export function toVerifiedEvents(
  community: SceneContribution[]
): ContentEvent[] {
  return community
    // Oyla doğrulanmış VEYA arkadaşının eklediği sahneler skora katılır
    .filter((c) => c.net >= VERIFY_AT_NET || c.byFriend)
    .map((c) => ({
      id: c.id,
      tmdbId: c.tmdbId,
      category: c.category,
      startSeconds: c.startSeconds,
      endSeconds: c.endSeconds,
      severity: c.severity,
      confidence: null,
      description: { tr: c.description, en: c.description },
      source: "community_verified" as const,
      verificationCount: c.up,
    }));
}

// Katalog rozetleri için: verilen filmlerin DOĞRULANMIŞ topluluk sahneleri,
// skor birleşimine hazır ContentEvent biçiminde (tek toplu sorgu).
export async function getVerifiedEventsMap(
  ids: number[]
): Promise<Map<number, ContentEvent[]>> {
  const map = new Map<number, ContentEvent[]>();
  if (ids.length === 0) return map;
  const sb = getSupabase();
  const { data: rows, error } = await sb
    .from("scene_contributions")
    .select("*")
    .in("tmdb_id", ids);
  if (error || !rows || rows.length === 0) return map;

  const { data: votes } = await sb
    .from("scene_votes")
    .select("contribution_id, value")
    .in(
      "contribution_id",
      (rows as ContributionRow[]).map((r) => r.id)
    );
  const net = new Map<string, number>();
  for (const v of votes ?? []) {
    net.set(v.contribution_id, (net.get(v.contribution_id) ?? 0) + (v.value > 0 ? 1 : -1));
  }

  for (const r of rows as ContributionRow[]) {
    const n = net.get(r.id) ?? 0;
    if (n < VERIFY_AT_NET) continue;
    const list = map.get(r.tmdb_id) ?? [];
    list.push({
      id: r.id,
      tmdbId: r.tmdb_id,
      category: r.category,
      startSeconds: r.start_seconds,
      endSeconds: r.end_seconds,
      severity: Math.min(3, Math.max(1, r.severity)) as 1 | 2 | 3,
      confidence: null,
      description: { tr: r.description, en: r.description },
      source: "community_verified",
      verificationCount: n,
    });
    map.set(r.tmdb_id, list);
  }
  return map;
}

export async function addContribution(input: {
  tmdbId: number;
  category: ContentCategory;
  severity: 1 | 2 | 3;
  startSeconds: number;
  endSeconds: number;
  description: string;
  ownerToken: string;
}): Promise<void> {
  const { error } = await getSupabase().from("scene_contributions").insert({
    tmdb_id: input.tmdbId,
    category: input.category,
    severity: input.severity,
    start_seconds: input.startSeconds,
    end_seconds: input.endSeconds,
    description: input.description.slice(0, 300),
    owner_token: input.ownerToken,
  });
  if (error) throw new Error(`Sahne kaydedilemedi: ${error.message}`);
}

// Yalnızca ekleyen silebilir (oylar cascade ile birlikte silinir)
export async function deleteContribution(
  id: string,
  ownerToken: string
): Promise<void> {
  const { error } = await getSupabase()
    .from("scene_contributions")
    .delete()
    .eq("id", id)
    .eq("owner_token", ownerToken);
  if (error) throw new Error(`Sahne silinemedi: ${error.message}`);
}

// Aynı oy tekrarlanırsa geri çekilir; farklıysa değiştirilir
export async function voteContribution(
  id: string,
  token: string,
  value: 1 | -1
): Promise<void> {
  const sb = getSupabase();
  const { data: existing, error } = await sb
    .from("scene_votes")
    .select("value")
    .eq("contribution_id", id)
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(`Oy okunamadı: ${error.message}`);

  if (existing && existing.value === value) {
    const { error: delError } = await sb
      .from("scene_votes")
      .delete()
      .eq("contribution_id", id)
      .eq("token", token);
    if (delError) throw new Error(`Oy geri çekilemedi: ${delError.message}`);
    return;
  }
  const { error: upsertError } = await sb
    .from("scene_votes")
    .upsert(
      { contribution_id: id, token, value },
      { onConflict: "contribution_id,token" }
    );
  if (upsertError) throw new Error(`Oy kaydedilemedi: ${upsertError.message}`);
}
