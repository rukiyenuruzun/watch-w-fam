"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { removeRequest, requestAnalysis } from "@/lib/analysis";
import {
  addContribution,
  deleteContribution,
  voteContribution,
} from "@/lib/contributions";
import { parseTimestamp } from "@/lib/format";
import { LOCALE_COOKIE } from "@/lib/locale";
import {
  SENSITIVITY_LEVELS,
  setSensitivity,
  type SensitivityLevel,
} from "@/lib/sensitivity";
import { THEME_COOKIE, THEMES, type Theme } from "@/lib/theme";
import type { RiskVote } from "@/lib/types";
import { CONTENT_CATEGORIES, type ContentCategory } from "@/lib/types";

export async function requestAnalysisAction(tmdbId: number) {
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return;
  await requestAnalysis(tmdbId);
  revalidatePath(`/film/${tmdbId}`);
  revalidatePath("/durum"); // kuyruk listesi de tazelensin
}

// "Altyazı bulunamadı" ile takılmış talebi kuyruktan kaldırır
export async function removeRequestAction(tmdbId: number) {
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return;
  await removeRequest(tmdbId);
  revalidatePath(`/film/${tmdbId}`);
  revalidatePath("/durum");
}

// Yorum formunun ortak alanlarını çözer (ekleme + düzenleme aynı yapıyı kullanır)
function parseCommentFields(formData: FormData) {
  const likedRaw = formData.get("liked");
  const voteRaw = String(formData.get("riskVote") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const liked = likedRaw === "yes" ? true : likedRaw === "no" ? false : null;
  const riskVote: RiskVote | null =
    voteRaw === "lower" || voteRaw === "correct" || voteRaw === "higher"
      ? voteRaw
      : null;
  return { name, liked, riskVote, text };
}

// Tarayıcının anonim kimlik çerezini döndürür, yoksa oluşturur.
async function ensureAnonToken(): Promise<string> {
  const { COMMENTER_COOKIE } = await import("@/lib/comments");
  const store = await cookies();
  let token = store.get(COMMENTER_COOKIE)?.value;
  if (!token) {
    token = crypto.randomUUID();
    store.set(COMMENTER_COOKIE, token, {
      maxAge: 60 * 60 * 24 * 365 * 5,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }
  return token;
}

// Yorum sahipliği ve izleme listesi kimliği: girişliyse kullanıcı,
// değilse anonim çerez (gerekiyorsa oluşturulur)
async function ensureIdentity() {
  const { getAuthUser } = await import("@/lib/auth");
  const user = await getAuthUser();
  if (user) return { token: user.id, user };
  return { token: await ensureAnonToken(), user: null };
}

export async function addCommentAction(formData: FormData) {
  const tmdbId = Number(formData.get("tmdbId"));
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return;

  const fields = parseCommentFields(formData);
  // Boş gönderi kaydedilmez: en az bir oy veya yorum metni olmalı
  if (!fields.text && fields.liked === null && fields.riskVote === null) return;

  const { token, user } = await ensureIdentity();
  if (user) {
    // Girişli kullanıcının yorumu hesap adıyla çıkar
    const { displayName } = await import("@/lib/auth");
    fields.name = displayName(user);
  }
  const { addComment } = await import("@/lib/comments");
  await addComment({ tmdbId, ...fields, ownerToken: token });
  revalidatePath(`/film/${tmdbId}`);
}

export async function toggleWatchlistAction(tmdbId: number) {
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return;
  const { token } = await ensureIdentity();
  const { toggleWatchlist } = await import("@/lib/watchlist");
  await toggleWatchlist(token, tmdbId);
  // Yer imi simgesi katalogda, film sayfasında, listede ve durum sayfasında
  // görünüyor; hepsi tazelensin
  revalidatePath("/", "layout");
}

// Topluluk sahne katkısı: form alanlarını doğrulayıp kaydeder
export async function addSceneAction(formData: FormData) {
  const tmdbId = Number(formData.get("tmdbId"));
  const category = String(formData.get("category") ?? "");
  const severity = Number(formData.get("severity"));
  const start = parseTimestamp(String(formData.get("start") ?? ""));
  const end = parseTimestamp(String(formData.get("end") ?? ""));
  const description = String(formData.get("description") ?? "").trim();

  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return;
  if (!CONTENT_CATEGORIES.includes(category as ContentCategory)) return;
  if (![1, 2, 3].includes(severity)) return;
  // Zamanlar geçerli, sıralı ve makul olmalı (6 saatlik üst sınır)
  if (start === null || end === null || start >= end || end > 6 * 3600) return;
  if (description.length < 3) return;

  const { token } = await ensureIdentity();
  await addContribution({
    tmdbId,
    category: category as ContentCategory,
    severity: severity as 1 | 2 | 3,
    startSeconds: start,
    endSeconds: end,
    description,
    ownerToken: token,
  });
  // Doğrulanmış sahneler rozet/riskleri her yerde etkileyebilir
  revalidatePath("/", "layout");
}

export async function deleteSceneAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { getIdentity } = await import("@/lib/auth");
  const { token } = await getIdentity();
  if (!token) return;
  await deleteContribution(id, token);
  revalidatePath("/", "layout");
}

export async function voteSceneAction(id: string, value: number) {
  if (!id || typeof id !== "string") return;
  if (value !== 1 && value !== -1) return;
  const { token } = await ensureIdentity();
  await voteContribution(id, token, value);
  revalidatePath("/", "layout");
}

// Hassasiyet profili: tek kategorinin çarpanını günceller
export async function setSensitivityAction(category: string, level: number) {
  if (!CONTENT_CATEGORIES.includes(category as ContentCategory)) return;
  if (!(SENSITIVITY_LEVELS as readonly number[]).includes(level)) return;
  const { token } = await ensureIdentity();
  await setSensitivity(
    token,
    category as ContentCategory,
    level as SensitivityLevel
  );
  // Hüküm rozetleri her sayfada bu profille hesaplanıyor
  revalidatePath("/", "layout");
}

// Giriş sonrası: tarayıcıdaki anonim liste/yorumlar hesaba taşınır
export async function mergeAnonDataAction() {
  const { getAuthUser, mergeAnonData } = await import("@/lib/auth");
  const user = await getAuthUser();
  if (!user) return;
  await mergeAnonData(user);
  revalidatePath("/", "layout");
}

export async function signOutAction() {
  const { getAuthClient } = await import("@/lib/auth");
  const supabase = await getAuthClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

export async function updateCommentAction(formData: FormData) {
  const tmdbId = Number(formData.get("tmdbId"));
  const id = String(formData.get("id") ?? "");
  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || !id) return;

  const fields = parseCommentFields(formData);
  if (!fields.text && fields.liked === null && fields.riskVote === null) return;

  const { getIdentity } = await import("@/lib/auth");
  const { token } = await getIdentity();
  if (!token) return;

  const { updateComment } = await import("@/lib/comments");
  await updateComment(id, token, fields);
  revalidatePath(`/film/${tmdbId}`);
}

export async function deleteCommentAction(formData: FormData) {
  const tmdbId = Number(formData.get("tmdbId"));
  const id = String(formData.get("id") ?? "");
  if (!Number.isInteger(tmdbId) || tmdbId <= 0 || !id) return;

  const { getIdentity } = await import("@/lib/auth");
  const { token } = await getIdentity();
  if (!token) return;

  const { deleteComment } = await import("@/lib/comments");
  await deleteComment(id, token);
  revalidatePath(`/film/${tmdbId}`);
}

export async function setLocaleAction(locale: string) {
  if (locale !== "tr" && locale !== "en") return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  revalidatePath("/", "layout");
}

// Profil düzenleme: görünen ad ve/veya avatar. Avatar herkese açık
// "avatars" kovasına kullanıcı kimliğiyle yazılır (üzerine yazılır),
// adres kullanıcı metadata'sında tutulur.
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function updateProfileAction(formData: FormData) {
  const { getAuthUser } = await import("@/lib/auth");
  const user = await getAuthUser();
  if (!user) return;

  const { getSupabase } = await import("@/lib/supabase");
  const sb = getSupabase();
  const meta: Record<string, unknown> = {};

  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, 40);
  if (name) meta.display_name = name;

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const ext = AVATAR_TYPES[avatar.type];
    if (!ext || avatar.size > AVATAR_MAX_BYTES) return;
    const path = `${user.id}.${ext}`;
    const { error } = await sb.storage
      .from("avatars")
      .upload(path, Buffer.from(await avatar.arrayBuffer()), {
        contentType: avatar.type,
        upsert: true,
      });
    if (error) return;
    const { data } = sb.storage.from("avatars").getPublicUrl(path);
    // Sorgu eki, tarayıcı önbelleğindeki eski fotoğrafı geçersiz kılar
    meta.avatar_url = `${data.publicUrl}?v=${Date.now()}`;
  }

  if (Object.keys(meta).length === 0) return;
  await sb.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, ...meta },
  });
  revalidatePath("/", "layout");
}

export async function setThemeAction(theme: string) {
  if (!THEMES.includes(theme as Theme)) return;
  const store = await cookies();
  store.set(THEME_COOKIE, theme, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  revalidatePath("/", "layout");
}
