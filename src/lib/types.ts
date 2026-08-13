// Belgedeki "İçerik kategorileri" bölümüyle birebir aynı — ilk sürümde sınırlı tutuluyor.
export type ContentCategory =
  | "short_kiss"
  | "long_kiss"
  | "sexual_dialogue"
  | "sexual_implication"
  | "explicit_sexual_content"
  | "profanity";

export const CONTENT_CATEGORIES: ContentCategory[] = [
  "short_kiss",
  "long_kiss",
  "sexual_dialogue",
  "sexual_implication",
  "explicit_sexual_content",
  "profanity",
];

export type EventSource =
  | "subtitle_auto" // Otomatik altyazı analizi
  | "user_contribution" // Kullanıcı katkısı
  | "community_verified" // Topluluk tarafından doğrulandı
  | "moderator_verified"; // Moderatör tarafından doğrulandı

// Arayüz iki dilli olduğu için açıklamalar iki dilde tutuluyor.
// Gerçek sistemde açıklama tek dilde üretilip çevrilebilir.
export interface LocalizedText {
  tr: string;
  en: string;
}

// Belgedeki "Content events" tablosunun karşılığı
export interface ContentEvent {
  id: string;
  tmdbId: number;
  category: ContentCategory;
  startSeconds: number;
  endSeconds: number;
  severity: 1 | 2 | 3; // 1 hafif, 2 orta, 3 yoğun
  confidence: number | null; // 0-1, kullanıcı katkısında null
  description: LocalizedText;
  source: EventSource;
  verificationCount: number;
}

export type AnalysisStatus =
  | "none" // Analiz bulunmuyor
  | "requested" // Analiz talep edildi
  | "searching_subtitle" // Uygun altyazı aranıyor
  | "analyzing" // Analiz yapılıyor
  | "completed" // Analiz tamamlandı
  | "quota_exceeded" // Günlük indirme kotası doldu, sonra otomatik denenecek
  | "worker_error" // Geçici sorun (ağ kesintisi vb.), sonra otomatik denenecek
  | "subtitle_not_found"; // Altyazı bulunamadı

export interface FilmAnalysis {
  tmdbId: number;
  status: AnalysisStatus;
  // Sürüm sorunu: analizin hangi altyazı/sürüm üzerinden yapıldığı
  subtitleLanguage?: string; // dil kodu: "en", "tr"
  subtitleVersion?: string;
  referenceRuntimeMinutes?: number;
  events: ContentEvent[];
}

// TMDB'den (veya demo veriden) gelen katalog bilgisi
export interface Film {
  tmdbId: number;
  title: string;
  originalTitle: string;
  releaseYear: number | null;
  runtime: number | null; // dakika
  posterPath: string | null;
  backdropPath?: string | null; // geniş sahne görseli (film sayfası fonu)
  overview: string;
  genres: string[];
  genreIds: number[]; // TMDB tür kimlikleri (filtreleme için)
  originalLanguage?: string; // "en", "tr" …
  cast?: string[];
  director?: string;
  voteAverage?: number | null;
  // Resmî yaş sınırı (TMDB). Altyazı analizinin göremediği görsel içerik
  // için tek dış kanıt: "16+", "18", "R", "PG-13"…
  certification?: string | null;
  certificationCountry?: string | null; // "TR", "US"…
  minAge?: number | null; // sınırdan çıkarılan sayı (PG-13 → 13, R → 17)
}

// Kullanıcı değerlendirmesi: filmi beğenme + "yüzdemiz doğru mu?" oyu + yorum
export type RiskVote = "lower" | "correct" | "higher";

export interface FilmComment {
  id: string;
  tmdbId: number;
  name: string; // boşsa arayüzde "Anonim"
  liked: boolean | null; // filmi beğendi mi (opsiyonel)
  riskVote: RiskVote | null; // toplu risk yüzdesi hakkında oy (opsiyonel)
  text: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO — düzenlendiyse
  // Yorumu yazan tarayıcının anonim çerez kimliği; düzenleme/silme yetkisi
  // buna bakılarak verilir. İstemciye asla gönderilmez. (Eski yorumlarda yok.)
  ownerToken?: string;
}
