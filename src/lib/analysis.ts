import type { FilmAnalysis } from "./types";
import { DEMO_ANALYSES } from "./demo-data";
import { getSupabase } from "./supabase";

// Analiz talepleri ve sonuçları Supabase'de tutulur (Adım 3);
// DEMO_ANALYSES yalnızca tanıtım filmleri için yedek olarak kalır.

export interface RequestRecord {
  tmdbId: number;
  requestedAt: string;
  requestCount: number;
  // analyzer/worker.py bu alanları günceller
  status?: string;
  retryAt?: number; // kota/hata beklerken yeniden deneme zamanı (epoch sn)
  errorCount?: number; // üst üste geçici hata sayısı (işçi pes etme eşiği)
}

const WORKER_STATUSES = new Set([
  "requested",
  "searching_subtitle",
  "analyzing",
  "quota_exceeded",
  "worker_error",
  "subtitle_not_found",
]);

interface RequestRow {
  tmdb_id: number;
  requested_at: string;
  request_count: number;
  status: string;
  retry_at: string | null;
  error_count: number;
}

function toRequest(row: RequestRow): RequestRecord {
  return {
    tmdbId: row.tmdb_id,
    requestedAt: row.requested_at,
    requestCount: row.request_count,
    status: row.status,
    retryAt: row.retry_at
      ? new Date(row.retry_at).getTime() / 1000
      : undefined,
    errorCount: row.error_count,
  };
}

// Durum sayfası için: bekleyen talep kuyruğu
export async function getRequests(): Promise<RequestRecord[]> {
  const { data, error } = await getSupabase()
    .from("analysis_requests")
    .select("*")
    .order("requested_at", { ascending: true });
  if (error) throw new Error(`Talepler okunamadı: ${error.message}`);
  return (data as RequestRow[]).map(toRequest);
}

// Analizi tamamlanmış tüm film kimlikleri (veritabanı + demo).
// EN SON analiz edilen başta: "Yeni analiz edilenler" rafından "tümünü gör"e
// geçildiğinde sıra korunsun — sıralamasız sorgu filmleri en eskiden
// başlatıyordu, bu da rafın vaadiyle çelişiyordu.
export async function getAnalyzedIds(): Promise<number[]> {
  const { data, error } = await getSupabase()
    .from("analyses")
    .select("tmdb_id")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Analiz listesi okunamadı: ${error.message}`);
  const ids = new Set<number>(data.map((row) => row.tmdb_id));
  for (const id of Object.keys(DEMO_ANALYSES).map(Number)) ids.add(id);
  return [...ids];
}

// Ana sayfa "Yeni analiz edilenler" rafı: en son biten analizler önce
export async function getRecentAnalyzedIds(limit: number): Promise<number[]> {
  const { data, error } = await getSupabase()
    .from("analyses")
    .select("tmdb_id")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Analiz listesi okunamadı: ${error.message}`);
  return data.map((r) => r.tmdb_id);
}

// Katalog/liste sayfaları için: verilen filmlerin TAMAMLANMIŞ analizleri
// tek sorguda (film başına ayrı sorgu atmamak için)
export async function getCompletedAnalyses(
  ids: number[]
): Promise<Map<number, FilmAnalysis>> {
  const map = new Map<number, FilmAnalysis>();
  if (ids.length === 0) return map;
  const { data, error } = await getSupabase()
    .from("analyses")
    .select("tmdb_id, data")
    .in("tmdb_id", ids);
  if (error) throw new Error(`Analizler okunamadı: ${error.message}`);
  for (const row of data) map.set(row.tmdb_id, row.data as FilmAnalysis);
  for (const id of ids) {
    if (!map.has(id) && DEMO_ANALYSES[id]) map.set(id, DEMO_ANALYSES[id]);
  }
  return map;
}

export async function getAnalysis(tmdbId: number): Promise<FilmAnalysis> {
  const sb = getSupabase();

  // Gerçek analiz sonucu öncelikli
  const { data: row, error } = await sb
    .from("analyses")
    .select("data")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (error) throw new Error(`Analiz okunamadı: ${error.message}`);
  if (row) return row.data as FilmAnalysis;

  const demo = DEMO_ANALYSES[tmdbId];
  if (demo) return demo;

  // Analiz yoksa varsa talep durumunu göster
  const { data: reqRow, error: reqError } = await sb
    .from("analysis_requests")
    .select("status")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (reqError) throw new Error(`Talep okunamadı: ${reqError.message}`);
  const status =
    reqRow?.status && WORKER_STATUSES.has(reqRow.status)
      ? (reqRow.status as FilmAnalysis["status"])
      : reqRow
        ? "requested"
        : "none";
  return { tmdbId, status, events: [] };
}

// Kuyruktan kaldırma: yalnızca "altyazı bulunamadı" ile sonuçlanmış talepler
// silinebilir — durum koşulu, işçinin o an işlediği bir kaydın altından
// çekilmesini önler
export async function removeRequest(tmdbId: number): Promise<void> {
  const { error } = await getSupabase()
    .from("analysis_requests")
    .delete()
    .eq("tmdb_id", tmdbId)
    .eq("status", "subtitle_not_found");
  if (error) throw new Error(`Talep silinemedi: ${error.message}`);
}

export async function requestAnalysis(tmdbId: number): Promise<void> {
  const sb = getSupabase();
  const { data: existing, error } = await sb
    .from("analysis_requests")
    .select("request_count, status")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (error) throw new Error(`Talep okunamadı: ${error.message}`);

  if (existing) {
    // Aynı film için birden fazla talep tek analiz işinde toplanır.
    // "Altyazı bulunamadı" kalıcı bir son; yeni talep işi kuyruğa geri sokar
    // (yeni altyazı yüklenmiş ya da önceki deneme ağ sorununa denk gelmiş olabilir)
    const patch: Record<string, unknown> = {
      request_count: existing.request_count + 1,
    };
    if (existing.status === "subtitle_not_found") {
      patch.status = "requested";
      patch.retry_at = null;
      patch.error_count = 0;
    }
    const { error: updateError } = await sb
      .from("analysis_requests")
      .update(patch)
      .eq("tmdb_id", tmdbId);
    if (updateError)
      throw new Error(`Talep güncellenemedi: ${updateError.message}`);
  } else {
    const { error: insertError } = await sb
      .from("analysis_requests")
      .insert({ tmdb_id: tmdbId, status: "requested" });
    if (insertError)
      throw new Error(`Talep kaydedilemedi: ${insertError.message}`);
  }
}
