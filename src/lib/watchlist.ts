import { getSupabase } from "./supabase";

// İzleme listeleri anonim tarayıcı kimliğine (commenter çerezi) bağlıdır;
// üyelik sistemi gelince gerçek kullanıcı hesabına taşınacak.
export interface WatchlistEntry {
  tmdbId: number;
  addedAt: string; // ISO
}

export async function getWatchlist(
  token: string | undefined
): Promise<WatchlistEntry[]> {
  if (!token) return [];
  const { data, error } = await getSupabase()
    .from("watchlists")
    .select("tmdb_id, added_at")
    .eq("token", token)
    .order("added_at", { ascending: false });
  if (error) throw new Error(`İzleme listesi okunamadı: ${error.message}`);
  return data.map((r) => ({ tmdbId: r.tmdb_id, addedAt: r.added_at }));
}

export async function getWatchlistIds(
  token: string | undefined
): Promise<Set<number>> {
  return new Set((await getWatchlist(token)).map((e) => e.tmdbId));
}

// Dönüş: işlem sonrası film listede mi
export async function toggleWatchlist(
  token: string,
  tmdbId: number
): Promise<boolean> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("watchlists")
    .delete()
    .eq("token", token)
    .eq("tmdb_id", tmdbId)
    .select();
  if (error) throw new Error(`Liste güncellenemedi: ${error.message}`);
  if (data.length > 0) return false; // kayıt vardı, silindi

  const { error: insertError } = await sb
    .from("watchlists")
    .insert({ token, tmdb_id: tmdbId });
  if (insertError) throw new Error(`Listeye eklenemedi: ${insertError.message}`);
  return true;
}
