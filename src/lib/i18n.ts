import type {
  AnalysisStatus,
  ContentCategory,
  EventSource,
} from "./types";
import type { VerdictTier } from "./score";

export type Locale = "tr" | "en";
export const DEFAULT_LOCALE: Locale = "tr";

export const TMDB_LANG: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-US",
};

interface Dictionary {
  siteTagline: string;
  draftBadge: string;
  ageRating: {
    title: (code: string) => string;
    floored: string;
    caution: string;
  };
  settings: {
    title: string;
    language: string;
    theme: string;
    themes: { dark: string; pink: string };
  };
  heroLines: [string, string, string];
  heroCta: string;
  heroRandom: string;
  searchPlaceholder: string;
  searchButton: string;
  recentSearches: string;
  removeSearch: string;
  demoModeNotice: string;
  popularFilms: string;
  resultsFor: (q: string) => string;
  noResults: string;
  personFilms: (name: string) => string;
  peopleHint: string;
  loadMore: string;
  backToCatalog: string;
  originalTitle: string;
  minutes: string;
  director: string;
  cast: string;
  analysisTitle: string;
  noAnalysis: string;
  requestAnalysis: string;
  requestPending: string;
  retryAnalysis: string;
  statusLabel: string;
  requestedNote: string;
  overallRisk: string;
  verdicts: Record<VerdictTier, { title: string; subtitle: string }>;
  contentSummary: string;
  scoreExplainer: string;
  scenesTooltip: (n: number, perHour: number) => string;
  timestampedScenes: string;
  records: string;
  confidence: (pct: number) => string;
  verifiedBy: (n: number) => string;
  versionNote: (lang: string, version: string, runtime?: number) => string;
  footer: string;
  statusPage: {
    navTitle: string;
    title: string;
    quotaTitle: string;
    quotaLine: (used: number, allowed: number) => string;
    quotaResets: (time: string) => string;
    quotaUnavailable: string;
    queueTitle: string;
    queueEmpty: string;
    requestedAtLabel: string;
    retryScheduled: (time: string) => string;
    removeRequest: string;
    removeRequestPending: string;
    analyzedTitle: string;
  };
  filters: {
    genre: string;
    risk: string;
    length: string;
    rating: string;
    year: string;
    language: string;
    sort: string;
    all: string;
    apply: string;
    clear: string;
    analyzedOnly: string;
    risks: Record<"ok" | "risky" | "nope" | "never", string>;
    lengths: Record<"short" | "mid" | "long" | "xlong", string>;
    decades: Record<
      "2020s" | "2010s" | "2000s" | "1990s" | "1980s" | "older" | "classic",
      string
    >;
    sorts: Record<"popular" | "rating" | "newest" | "risk", string>;
    ratingAtLeast: (n: number) => string;
  };
  comments: {
    title: string;
    voteSummary: string;
    voteLower: string;
    voteCorrect: string;
    voteHigher: string;
    formTitle: string;
    nameLabel: string;
    likedLabel: string;
    likedYes: string;
    likedNo: string;
    voteLabel: string;
    textLabel: string;
    textPlaceholder: string;
    submit: string;
    empty: string;
    anonymous: string;
    edit: string;
    delete: string;
    deleteConfirm: string;
    deleteYes: string;
    cancel: string;
    save: string;
    edited: string;
    cta: string;
  };
  auth: {
    navSignIn: string;
    signOut: string;
    title: string;
    note: string;
    emailLabel: string;
    passwordLabel: string;
    signInButton: string;
    signUpButton: string;
    google: string;
    or: string;
    toggleToSignUp: string;
    toggleToSignIn: string;
    checkEmail: string;
    sending: string;
  };
  watchlist: {
    navTitle: string;
    title: string;
    add: string;
    remove: string;
    inList: string;
    empty: string;
    note: string;
    sortByRisk: string;
    sortByRiskHint: string;
  };
  profile: {
    navTitle: string;
    editName: string;
    changePhoto: string;
    photoTooBig: string;
    memberSince: (date: string) => string;
    statComments: (n: number) => string;
    statFilms: (n: number) => string;
    commentsTitle: string;
    commentsEmpty: string;
    seeAll: string;
    sensitivityTitle: string;
    sensitivityNote: string;
    sensitivityLevels: Record<"off" | "normal" | "sensitive" | "very", string>;
  };
  personalizedNote: string;
  randomPick: {
    safe: string;
    risky: string;
    reshuffle: string;
  };
  shelves: {
    recent: string;
    familyComedies: string;
    cleanClassics: string;
    seeAll: string;
  };
  community: {
    sectionTitle: string;
    note: string;
    verifiedChip: string;
    pendingChip: string;
    addScene: string;
    formTitle: string;
    categoryLabel: string;
    severityLabel: string;
    startLabel: string;
    endLabel: string;
    timeHint: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    submit: string;
    sending: string;
    voteUp: string;
    voteDown: string;
  };
  categories: Record<ContentCategory, string>;
  statuses: Record<AnalysisStatus, string>;
  sources: Record<EventSource, string>;
  severities: Record<1 | 2 | 3, string>;
}

export const DICTIONARIES: Record<Locale, Dictionary> = {
  tr: {
    siteTagline: "what to watch with family",
    draftBadge: "taslak sürüm",
    ageRating: {
      title: (code) => `Resmî yaş sınırı: ${code}`,
      floored:
        "Bu yapım yetişkinler için sınıflandırılmış. Analizimiz yalnızca altyazıyı okuduğu için konuşmasız (görsel) sahneleri göremez; bu yüzden hüküm en az \"riskli\" sayılır. Aşağıdaki yüzde yine de sadece bulunan sahnelere dayanır.",
      caution:
        "Bu yapım yetişkinler için sınıflandırılmış ama analizimiz çok az cinsel içerik buldu. Analiz yalnızca altyazıyı okur; konuşmasız (görsel) sahneler kaçmış olabilir. Eksik gördüğün sahneyi aşağıdan ekleyebilirsin.",
    },
    settings: {
      title: "Ayarlar",
      language: "Dil",
      theme: "Görünüm",
      themes: { dark: "Classic", pink: "Pink" },
    },
    heroLines: [
      "Bu film aileyle izlenir mi?",
      "Sahneleri önceden bil.",
      "Koltukta mahcup olma.",
    ],
    heroCta: "Kataloğa göz at 🍿",
    heroRandom: "Rastgele güvenli film 🎲",
    searchPlaceholder: "Film ara… (ör. Titanic)",
    searchButton: "Ara",
    recentSearches: "Son aramalar",
    removeSearch: "Geçmişten sil",
    demoModeNotice:
      "Demo mod: TMDB API anahtarı tanımlı değil, örnek katalog gösteriliyor. Gerçek arama için .env.local dosyasına TMDB_API_KEY ekleyin.",
    popularFilms: "Popüler filmler",
    resultsFor: (q) => `"${q}" için sonuçlar`,
    noResults: "Sonuç bulunamadı. Farklı bir arama deneyin.",
    personFilms: (name) => `${name} filmleri`,
    peopleHint: "Şunu mu aradın:",
    loadMore: "Daha fazla göster",
    backToCatalog: "← Kataloğa dön",
    originalTitle: "Orijinal ad",
    minutes: "dk",
    director: "Yönetmen",
    cast: "Oyuncular",
    analysisTitle: "İçerik Analizi",
    noAnalysis: "Bu film için henüz içerik analizi bulunmuyor.",
    requestAnalysis: "Analiz talep et",
    requestPending: "Gönderiliyor…",
    retryAnalysis: "Tekrar dene",
    statusLabel: "Durum",
    requestedNote:
      "Bu sayfa kendini otomatik günceller — açık bırakmanız yeterli, analiz genellikle 1-2 dakika sürer.",
    overallRisk: "toplu risk",
    verdicts: {
      ok: {
        title: "Aileyle izlenir 👌",
        subtitle: "Çok çok katı değillerse sorun çıkmaz. Çayını al, gel.",
      },
      risky: {
        title: "Riskli — kumanda yakında dursun",
        subtitle:
          "Birkaç sahnede aniden mutfaktan bir şey almak isteyebilirsin.",
      },
      nope: {
        title: "Yoook, izlenmez!",
        subtitle: "Bunu aileyle değil, arkadaşınla izle. Ciddiyiz.",
      },
      never: {
        title: "HAYATTA izlenmez!!",
        subtitle: "Ailenin haberi bile olmasın.",
      },
    },
    contentSummary: "İçerik Yoğunluğu",
    scoreExplainer:
      "Yüzdeler taslak bir formülle hesaplanır: sahnelerin şiddeti toplanıp film süresine oranlanır. Toplu risk, kategori ağırlıklarıyla birleştirilir (çıplak sahne en ağır, konuşmalar öpüşmeden utandırıcı, küfür ve öpüşme hafif). Ağırlıklar ileride kişisel hassasiyet profiline göre değişecek.",
    scenesTooltip: (n, perHour) =>
      `${n} sahne · saatte ${perHour} şiddet puanı`,
    timestampedScenes: "Zaman Damgalı Sahneler",
    records: "kayıt",
    confidence: (pct) => `Güven: %${pct}`,
    verifiedBy: (n) => `${n} kişi doğruladı`,
    versionNote: (lang, version, runtime) =>
      `Analiz ${lang} ${version} altyazısı üzerinden oluşturuldu` +
      (runtime ? ` (referans süre: ${runtime} dk)` : "") +
      ". Farklı film sürümlerinde zamanlar birkaç saniye değişebilir.",
    footer:
      "Film verileri TMDB'den alınmaktadır. Bu site film barındırmaz ve yayınlamaz; yalnızca içerik bilgisi sunar.",
    statusPage: {
      navTitle: "Durum",
      title: "Analiz Durumu",
      quotaTitle: "Günlük indirme kotası (OpenSubtitles)",
      quotaLine: (used, allowed) => `${used} / ${allowed} kullanıldı`,
      quotaResets: (time) => `Sıfırlanma: ${time}`,
      quotaUnavailable:
        "Kota bilgisi alınamadı — .env.local içindeki OpenSubtitles bilgilerini kontrol edin.",
      queueTitle: "Bekleyen talepler",
      queueEmpty: "Bekleyen talep yok — kuyruk temiz. 🎉",
      requestedAtLabel: "talep",
      retryScheduled: (time) => `yeniden deneme: ${time}`,
      removeRequest: "Kaldır",
      removeRequestPending: "Kaldırılıyor…",
      analyzedTitle: "Analiz edilmiş filmler",
    },
    filters: {
      genre: "Tür",
      risk: "Risk",
      length: "Süre",
      rating: "Puan",
      year: "Yıl",
      language: "Dil",
      sort: "Sırala",
      all: "Tümü",
      apply: "Filtrele",
      clear: "Temizle",
      analyzedOnly: "Analiz edilmişler",
      risks: {
        ok: "🍿 İzlenir (%50 altı)",
        risky: "😬 Riskli (%50–69)",
        nope: "🚨 İzlenmez (%70–89)",
        never: "☠️ Hayatta olmaz (%90+)",
      },
      lengths: {
        short: "90 dk altı",
        mid: "90–120 dk",
        long: "120–150 dk",
        xlong: "150 dk üstü",
      },
      decades: {
        "2020s": "2020'ler",
        "2010s": "2010'lar",
        "2000s": "2000'ler",
        "1990s": "90'lar",
        "1980s": "80'ler",
        older: "Daha eski",
        classic: "2000 öncesi (klasikler)",
      },
      sorts: {
        popular: "Popülerlik",
        rating: "Puan (yüksek→düşük)",
        newest: "Yıl (yeni→eski)",
        risk: "Risk (güvenli→riskli)",
      },
      ratingAtLeast: (n) => `${n} ve üzeri`,
    },
    comments: {
      title: "Değerlendirmeler",
      voteSummary: "Yüzdemiz doğru mu?",
      voteLower: "Daha az olmalıydı",
      voteCorrect: "Evet, doğru",
      voteHigher: "Daha fazla olmalıydı",
      formTitle: "Sen de değerlendir",
      nameLabel: "Adın (isteğe bağlı)",
      likedLabel: "Filmi beğendin mi?",
      likedYes: "👍 Beğendim",
      likedNo: "👎 Beğenmedim",
      voteLabel: "Toplu risk yüzdemiz doğru mu?",
      textLabel: "Yorumun",
      textPlaceholder:
        "Aileyle izleme deneyimin, eksik gördüğün sahne, eklemek istediğin her şey…",
      submit: "Gönder",
      empty: "Henüz değerlendirme yok. İlk yorumu sen yaz!",
      anonymous: "Anonim",
      edit: "Düzenle",
      delete: "Sil",
      deleteConfirm: "Silinsin mi?",
      deleteYes: "Evet, sil",
      cancel: "Vazgeç",
      save: "Kaydet",
      edited: "düzenlendi",
      cta: "Yorum yaz",
    },
    auth: {
      navSignIn: "Giriş yap",
      signOut: "Çıkış",
      title: "Giriş yap / Kayıt ol",
      note: "Giriş zorunlu değil — ama girersen izleme listen ve yorumların hesabına bağlanır, her cihazdan erişirsin. Tarayıcıdaki mevcut listen de hesabına taşınır.",
      emailLabel: "E-posta",
      passwordLabel: "Şifre",
      signInButton: "Giriş yap",
      signUpButton: "Kayıt ol",
      google: "Google ile devam et",
      or: "veya",
      toggleToSignUp: "Hesabın yok mu? Kayıt ol",
      toggleToSignIn: "Zaten hesabın var mı? Giriş yap",
      checkEmail: "Kayıt alındı — e-postana gelen doğrulama bağlantısına tıkla.",
      sending: "Gönderiliyor…",
    },
    watchlist: {
      navTitle: "Listem",
      title: "İzleme listem",
      add: "Listeye ekle",
      remove: "Listemden çıkar",
      inList: "Listende ✓",
      empty:
        "Listen henüz boş. Katalogdaki kartların köşesindeki yer imine ya da film sayfasındaki \"Listeye ekle\" butonuna tıklayarak film ekleyebilirsin.",
      note: "Liste bu tarayıcıya özeldir (üyelik sistemi gelene kadar).",
      sortByRisk: "Risksizden riskliye",
      sortByRiskHint: "Analizi olmayanlar en sonda",
    },
    profile: {
      navTitle: "Profil",
      editName: "Adı düzenle",
      changePhoto: "Fotoğrafı değiştir",
      photoTooBig: "Fotoğraf en fazla 2 MB olabilir (PNG, JPG ya da WebP).",
      memberSince: (date) => `Üyelik başlangıcı: ${date}`,
      statComments: (n) => `${n} yorum`,
      statFilms: (n) => `listede ${n} film`,
      commentsTitle: "Yorumlarım",
      commentsEmpty:
        "Henüz yorum yazmamışsın. Bir film sayfasının yorumlar bölümünden ilkini bırakabilirsin.",
      seeAll: "Tümünü gör →",
      sensitivityTitle: "Hassasiyet profilim",
      sensitivityNote:
        "Her kategori toplam riski ne kadar etkilesin? \"Önemsemem\" kategoriyi hesaptan tamamen çıkarır. Hükümler ve rozetler sitenin her yerinde sana göre yeniden hesaplanır; kategori barları tarafsız kalır.",
      sensitivityLevels: {
        off: "Önemsemem",
        normal: "Normal",
        sensitive: "Hassas",
        very: "Çok hassas",
      },
    },
    personalizedNote: "⚙️ Hassasiyet profiline göre hesaplandı",
    randomPick: {
      safe: "Şansına bu çıktı — hükmü temiz: aileyle rahat izlenir 👌",
      risky: "Şansına bu çıktı — ama biraz risk var 😬 İzlemeden önce sahne listesine göz at.",
      reshuffle: "Yeniden karıştır 🎲",
    },
    shelves: {
      recent: "Yeni analiz edilenler",
      familyComedies: "Ailece izlenebilir komediler",
      cleanClassics: "Temiz klasikler",
      seeAll: "Tümünü gör →",
    },
    community: {
      sectionTitle: "Topluluk sahneleri",
      note: "Altyazı analizi konuşmasız (görsel) sahneleri kaçırabilir. Eksik bir sahne görürsen buraya ekle. Yeni eklenenler hesaba KATILMAZ; topluluk 👍 ile doğrulayınca (net +1) risk hesabına ve hükme dahil olur.",
      verifiedChip: "✓ Doğrulandı — hesaba katılıyor",
      pendingChip: "⏳ Doğrulama bekliyor — henüz hesaba katılmıyor",
      addScene: "Sahne ekle",
      formTitle: "Eksik sahne bildir",
      categoryLabel: "Kategori",
      severityLabel: "Yoğunluk",
      startLabel: "Başlangıç",
      endLabel: "Bitiş",
      timeHint: "dk:sn ya da sa:dk:sn — ör. 12:30",
      descriptionLabel: "Açıklama",
      descriptionPlaceholder: "Sahnede ne oluyor? Kısa ve spoiler'sız yaz.",
      submit: "Gönder",
      sending: "Gönderiliyor…",
      voteUp: "Doğru",
      voteDown: "Yanlış",
    },
    categories: {
      short_kiss: "Kısa öpüşme",
      long_kiss: "Uzun öpüşme",
      sexual_dialogue: "Cinsellik içeren konuşma",
      sexual_implication: "Cinsel ima",
      explicit_sexual_content: "Açık cinsel içerik",
      profanity: "Küfür / argo",
    },
    statuses: {
      none: "Analiz bulunmuyor",
      requested: "Talebiniz sırada, birazdan işleme alınacak",
      searching_subtitle: "Uygun altyazı aranıyor",
      analyzing: "Analiz yapılıyor",
      completed: "Analiz tamamlandı",
      quota_exceeded:
        "Talebiniz alındı — günlük analiz kotası doldu, sırası gelince otomatik işlenecek",
      worker_error:
        "Geçici bir aksaklık oldu (ör. ağ bağlantısı) — birazdan otomatik yeniden denenecek",
      subtitle_not_found: "Bu film için uygun altyazı bulunamadı",
    },
    sources: {
      subtitle_auto: "Otomatik altyazı analizi",
      user_contribution: "Kullanıcı katkısı",
      community_verified: "Topluluk tarafından doğrulandı",
      moderator_verified: "Moderatör tarafından doğrulandı",
    },
    severities: { 1: "Hafif", 2: "Orta", 3: "Yoğun" },
  },
  en: {
    siteTagline: "what to watch with family",
    draftBadge: "draft version",
    ageRating: {
      title: (code) => `Official age rating: ${code}`,
      floored:
        "This title is rated for adults. Our analysis only reads subtitles, so it cannot see wordless (visual) scenes — the verdict is therefore capped at \"risky\" at best. The percentage below still reflects only what we found.",
      caution:
        "This title is rated for adults, yet our analysis found very little sexual content. The analysis only reads subtitles, so wordless (visual) scenes may have been missed. You can add any scene you know about below.",
    },
    settings: {
      title: "Settings",
      language: "Language",
      theme: "Appearance",
      themes: { dark: "Classic", pink: "Pink" },
    },
    heroLines: [
      "Can you watch it with your family?",
      "Know the scenes in advance.",
      "No awkward couch moments.",
    ],
    heroCta: "Browse the catalog 🍿",
    heroRandom: "Random safe pick 🎲",
    searchPlaceholder: "Search films… (e.g. Titanic)",
    searchButton: "Search",
    recentSearches: "Recent searches",
    removeSearch: "Remove from history",
    demoModeNotice:
      "Demo mode: no TMDB API key configured, showing a sample catalog. Add TMDB_API_KEY to .env.local for real search.",
    popularFilms: "Popular films",
    resultsFor: (q) => `Results for "${q}"`,
    personFilms: (name) => `${name} films`,
    peopleHint: "Did you mean:",
    noResults: "No results found. Try a different search.",
    loadMore: "Show more",
    backToCatalog: "← Back to catalog",
    originalTitle: "Original title",
    minutes: "min",
    director: "Director",
    cast: "Cast",
    analysisTitle: "Content Analysis",
    noAnalysis: "No content analysis available for this film yet.",
    requestAnalysis: "Request analysis",
    requestPending: "Sending…",
    retryAnalysis: "Try again",
    statusLabel: "Status",
    requestedNote:
      "This page updates automatically — just keep it open; analysis usually takes 1-2 minutes.",
    overallRisk: "overall risk",
    verdicts: {
      ok: {
        title: "Safe with family 👌",
        subtitle: "Unless they're ultra strict, you're fine. Grab the tea.",
      },
      risky: {
        title: "Risky — keep the remote close",
        subtitle:
          "You may suddenly need something from the kitchen a few times.",
      },
      nope: {
        title: "Nope, not with family!",
        subtitle: "Watch this one with a friend instead. We mean it.",
      },
      never: {
        title: "NEVER. Ever!!",
        subtitle: "Don't even tell the family.",
      },
    },
    contentSummary: "Content Intensity",
    scoreExplainer:
      "Percentages come from a draft formula: scene severities are summed and scaled by runtime. Overall risk combines categories with weights (explicit scenes heaviest, dialogue more embarrassing than kissing, profanity and kissing light). Weights will later adapt to your personal sensitivity profile.",
    scenesTooltip: (n, perHour) =>
      `${n} scene${n === 1 ? "" : "s"} · ${perHour} severity points/hour`,
    timestampedScenes: "Timestamped Scenes",
    records: "records",
    confidence: (pct) => `Confidence: ${pct}%`,
    verifiedBy: (n) => `Verified by ${n} ${n === 1 ? "person" : "people"}`,
    versionNote: (lang, version, runtime) =>
      `Analysis based on the ${lang} ${version} subtitle` +
      (runtime ? ` (reference runtime: ${runtime} min)` : "") +
      ". Timestamps may shift by a few seconds across film versions.",
    footer:
      "Film data comes from TMDB. This site does not host or stream films; it only provides content information.",
    statusPage: {
      navTitle: "Status",
      title: "Analysis Status",
      quotaTitle: "Daily download quota (OpenSubtitles)",
      quotaLine: (used, allowed) => `${used} / ${allowed} used`,
      quotaResets: (time) => `Resets: ${time}`,
      quotaUnavailable:
        "Couldn't fetch quota — check the OpenSubtitles credentials in .env.local.",
      queueTitle: "Pending requests",
      queueEmpty: "No pending requests — the queue is clear. 🎉",
      requestedAtLabel: "requested",
      retryScheduled: (time) => `retry at: ${time}`,
      removeRequest: "Remove",
      removeRequestPending: "Removing…",
      analyzedTitle: "Analyzed films",
    },
    filters: {
      genre: "Genre",
      risk: "Risk",
      length: "Runtime",
      rating: "Rating",
      year: "Year",
      language: "Language",
      sort: "Sort by",
      all: "All",
      apply: "Filter",
      clear: "Clear",
      analyzedOnly: "Analyzed only",
      risks: {
        ok: "🍿 Watchable (under 50%)",
        risky: "😬 Risky (50–69%)",
        nope: "🚨 Not with family (70–89%)",
        never: "☠️ Never ever (90%+)",
      },
      lengths: {
        short: "Under 90 min",
        mid: "90–120 min",
        long: "120–150 min",
        xlong: "Over 150 min",
      },
      decades: {
        "2020s": "2020s",
        "2010s": "2010s",
        "2000s": "2000s",
        "1990s": "1990s",
        "1980s": "1980s",
        older: "Older",
        classic: "Pre-2000 (classics)",
      },
      sorts: {
        popular: "Popularity",
        rating: "Rating (high→low)",
        newest: "Year (new→old)",
        risk: "Risk (safe→risky)",
      },
      ratingAtLeast: (n) => `${n} and above`,
    },
    comments: {
      title: "Reviews",
      voteSummary: "Is our percentage right?",
      voteLower: "Should be lower",
      voteCorrect: "Yes, it's right",
      voteHigher: "Should be higher",
      formTitle: "Add your review",
      nameLabel: "Your name (optional)",
      likedLabel: "Did you like the film?",
      likedYes: "👍 Liked it",
      likedNo: "👎 Didn't like it",
      voteLabel: "Is our overall risk percentage right?",
      textLabel: "Your comment",
      textPlaceholder:
        "Your family-watching experience, scenes we missed, anything you'd add…",
      submit: "Submit",
      empty: "No reviews yet. Be the first to write one!",
      anonymous: "Anonymous",
      edit: "Edit",
      delete: "Delete",
      deleteConfirm: "Delete this?",
      deleteYes: "Yes, delete",
      cancel: "Cancel",
      save: "Save",
      edited: "edited",
      cta: "Write a review",
    },
    auth: {
      navSignIn: "Sign in",
      signOut: "Sign out",
      title: "Sign in / Sign up",
      note: "Signing in is optional — but your watchlist and reviews get tied to your account, reachable from any device. Your current in-browser list is migrated to the account too.",
      emailLabel: "Email",
      passwordLabel: "Password",
      signInButton: "Sign in",
      signUpButton: "Sign up",
      google: "Continue with Google",
      or: "or",
      toggleToSignUp: "No account? Sign up",
      toggleToSignIn: "Already have an account? Sign in",
      checkEmail: "Registered — click the confirmation link sent to your email.",
      sending: "Sending…",
    },
    watchlist: {
      navTitle: "My List",
      title: "My watchlist",
      add: "Add to my list",
      remove: "Remove from my list",
      inList: "In your list ✓",
      empty:
        "Your list is empty. Add films with the bookmark on catalog cards or the \"Add to my list\" button on a film page.",
      note: "The list is tied to this browser (until accounts arrive).",
      sortByRisk: "Least risky first",
      sortByRiskHint: "Unanalyzed films go last",
    },
    profile: {
      navTitle: "Profile",
      editName: "Edit name",
      changePhoto: "Change photo",
      photoTooBig: "Photo must be at most 2 MB (PNG, JPG or WebP).",
      memberSince: (date) => `Member since ${date}`,
      statComments: (n) => (n === 1 ? "1 comment" : `${n} comments`),
      statFilms: (n) => (n === 1 ? "1 film in list" : `${n} films in list`),
      commentsTitle: "My comments",
      commentsEmpty:
        "No comments yet — you can leave your first one in the comments section of any film page.",
      seeAll: "See all →",
      sensitivityTitle: "My sensitivity profile",
      sensitivityNote:
        "How much should each category affect the overall risk? \"Don't mind\" removes the category from the math entirely. Verdicts and badges across the whole site are recalculated for you; the category bars stay neutral.",
      sensitivityLevels: {
        off: "Don't mind",
        normal: "Normal",
        sensitive: "Sensitive",
        very: "Very sensitive",
      },
    },
    personalizedNote: "⚙️ Computed with your sensitivity profile",
    randomPick: {
      safe: "Your lucky pick — clean verdict: safe to watch with family 👌",
      risky: "Your lucky pick — heads up, a bit risky 😬 Skim the scene list before watching.",
      reshuffle: "Shuffle again 🎲",
    },
    shelves: {
      recent: "Freshly analyzed",
      familyComedies: "Family-friendly comedies",
      cleanClassics: "Clean classics",
      seeAll: "See all →",
    },
    community: {
      sectionTitle: "Community scenes",
      note: "Subtitle analysis can miss visual (dialogue-free) scenes. If you spot a missing one, add it here. New entries do NOT count; once the community verifies with 👍 (net +1) they join the risk score and verdict.",
      verifiedChip: "✓ Verified — counted in the score",
      pendingChip: "⏳ Awaiting verification — not counted yet",
      addScene: "Add a scene",
      formTitle: "Report a missing scene",
      categoryLabel: "Category",
      severityLabel: "Intensity",
      startLabel: "Start",
      endLabel: "End",
      timeHint: "mm:ss or hh:mm:ss — e.g. 12:30",
      descriptionLabel: "Description",
      descriptionPlaceholder: "What happens in the scene? Keep it short and spoiler-free.",
      submit: "Submit",
      sending: "Sending…",
      voteUp: "Accurate",
      voteDown: "Not accurate",
    },
    categories: {
      short_kiss: "Brief kiss",
      long_kiss: "Long kiss",
      sexual_dialogue: "Sexual dialogue",
      sexual_implication: "Sexual innuendo",
      explicit_sexual_content: "Explicit sexual content",
      profanity: "Profanity / slang",
    },
    statuses: {
      none: "No analysis available",
      requested: "Your request is queued and will be picked up shortly",
      searching_subtitle: "Searching for a subtitle",
      analyzing: "Analyzing",
      completed: "Analysis completed",
      quota_exceeded:
        "Request received — daily analysis quota is used up; it will be processed automatically later",
      worker_error:
        "A temporary hiccup occurred (e.g. network) — it will be retried automatically shortly",
      subtitle_not_found: "No suitable subtitle found for this film",
    },
    sources: {
      subtitle_auto: "Automatic subtitle analysis",
      user_contribution: "User contribution",
      community_verified: "Community verified",
      moderator_verified: "Moderator verified",
    },
    severities: { 1: "Mild", 2: "Moderate", 3: "Intense" },
  },
};

// Altyazı dili adları da yerelleştirilir (demo veride "İngilizce" yazıyor)
export const SUBTITLE_LANG_NAMES: Record<Locale, Record<string, string>> = {
  tr: { en: "İngilizce", tr: "Türkçe" },
  en: { en: "English", tr: "Turkish" },
};
