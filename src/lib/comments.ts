import type { FilmComment, RiskVote } from "./types";
import { getSupabase } from "./supabase";

// Giriş sistemi olmadığından yorum sahipliği bu anonim çerezle izlenir
export const COMMENTER_COOKIE = "commenter";

interface CommentRow {
  id: string;
  tmdb_id: number;
  name: string;
  liked: boolean | null;
  risk_vote: RiskVote | null;
  text: string;
  owner_token: string | null;
  created_at: string;
  updated_at: string | null;
}

function toComment(row: CommentRow): FilmComment {
  return {
    id: row.id,
    tmdbId: row.tmdb_id,
    name: row.name,
    liked: row.liked,
    riskVote: row.risk_vote,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
    ownerToken: row.owner_token ?? undefined,
  };
}

export async function getComments(tmdbId: number): Promise<FilmComment[]> {
  const { data, error } = await getSupabase()
    .from("comments")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Yorumlar okunamadı: ${error.message}`);
  return (data as CommentRow[]).map(toComment);
}

// Profil sayfası: bu kimliğin tüm filmlerdeki yorumları (en yeni başta)
export async function getCommentsByOwner(
  ownerToken: string
): Promise<FilmComment[]> {
  const { data, error } = await getSupabase()
    .from("comments")
    .select("*")
    .eq("owner_token", ownerToken)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Yorumlar okunamadı: ${error.message}`);
  return (data as CommentRow[]).map(toComment);
}

export async function addComment(input: {
  tmdbId: number;
  name: string;
  liked: boolean | null;
  riskVote: RiskVote | null;
  text: string;
  ownerToken: string;
}): Promise<void> {
  const { error } = await getSupabase().from("comments").insert({
    tmdb_id: input.tmdbId,
    name: input.name.slice(0, 40),
    liked: input.liked,
    risk_vote: input.riskVote,
    text: input.text.slice(0, 1000),
    owner_token: input.ownerToken,
  });
  if (error) throw new Error(`Yorum kaydedilemedi: ${error.message}`);
}

// Yalnızca sahibi (aynı çerez kimliği) güncelleyebilir; eşleşme yoksa sessizce
// hiçbir şey olmaz. owner_token'sız eski yorumlar hiç düzenlenemez.
export async function updateComment(
  id: string,
  ownerToken: string,
  patch: {
    name: string;
    liked: boolean | null;
    riskVote: RiskVote | null;
    text: string;
  }
): Promise<void> {
  const { error } = await getSupabase()
    .from("comments")
    .update({
      name: patch.name.slice(0, 40),
      liked: patch.liked,
      risk_vote: patch.riskVote,
      text: patch.text.slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_token", ownerToken);
  if (error) throw new Error(`Yorum güncellenemedi: ${error.message}`);
}

export async function deleteComment(
  id: string,
  ownerToken: string
): Promise<void> {
  const { error } = await getSupabase()
    .from("comments")
    .delete()
    .eq("id", id)
    .eq("owner_token", ownerToken);
  if (error) throw new Error(`Yorum silinemedi: ${error.message}`);
}
