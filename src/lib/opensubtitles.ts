// OpenSubtitles kota bilgisi (Durum sayfası için).
// Giriş jetonu modül düzeyinde önbelleğe alınır; kota sorgusu önbelleksizdir.

const API = "https://api.opensubtitles.com/api/v1";
const USER_AGENT = "AileyleNeIzlenir v0.1";

export interface QuotaInfo {
  allowed: number;
  used: number;
  remaining: number;
  resetsAt: string | null; // ISO (UTC)
}

let cachedToken: { value: string; fetchedAt: number } | null = null;

async function getToken(apiKey: string): Promise<string | null> {
  // Jeton ~24 saat geçerli; 20 saatte bir yenile
  if (cachedToken && Date.now() - cachedToken.fetchedAt < 20 * 3600 * 1000) {
    return cachedToken.value;
  }
  const username = process.env.OPENSUBTITLES_USERNAME;
  const password = process.env.OPENSUBTITLES_PASSWORD;
  if (!username || !password) return null;
  try {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
    const token = (await res.json()).token as string | undefined;
    if (!token) return null;
    cachedToken = { value: token, fetchedAt: Date.now() };
    return token;
  } catch {
    return null;
  }
}

function fetchInfos(apiKey: string, token: string) {
  return fetch(`${API}/infos/user`, {
    headers: {
      "Api-Key": apiKey,
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
  });
}

export async function getQuota(): Promise<QuotaInfo | null> {
  const apiKey = process.env.OPENSUBTITLES_API_KEY;
  if (!apiKey) return null;
  let token = await getToken(apiKey);
  if (!token) return null;
  try {
    let res = await fetchInfos(apiKey, token);
    // Önbellekteki jeton başka bir girişle (ör. analiz işçisi aynı hesabı
    // kullanınca) geçersizleşmiş olabilir; bir kez taze girişle yinele
    if (res.status === 401 || res.status === 403) {
      cachedToken = null;
      token = await getToken(apiKey);
      if (!token) return null;
      res = await fetchInfos(apiKey, token);
    }
    const d = (await res.json()).data;
    if (!d) return null;
    return {
      allowed: d.allowed_downloads ?? 0,
      used: d.downloads_count ?? 0,
      remaining: d.remaining_downloads ?? 0,
      resetsAt: d.reset_time_utc ?? null,
    };
  } catch {
    return null;
  }
}
