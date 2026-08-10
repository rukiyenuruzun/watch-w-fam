"""Otomatik analiz işçisi — belgedeki "Analiz talep et" akışının tamamı.

Sitede butona basılınca data/analysis-requests.json'a talep düşer. Bu program:
  1. Bekleyen talepleri okur
  2. TMDB'den filmin adını/süresini alır
  3. OpenSubtitles'tan İngilizce altyazıyı arar ve indirir
  4. Analizi çalıştırır, sonucu data/analyses/<id>.json'a yazar
  5. Talep durumunu adım adım günceller (site yenileyince görünür):
     searching_subtitle → analyzing → completed | subtitle_not_found

Kullanım:
    python3 analyzer/worker.py            # kuyruğu bir kez işle
    python3 analyzer/worker.py --loop 60  # 60 sn'de bir kontrol et (sürekli)

Gerekli anahtarlar .env.local'dan okunur:
    TMDB_API_KEY veya TMDB_ACCESS_TOKEN  (katalog bilgisi için)
    OPENSUBTITLES_API_KEY                (altyazı indirme için, ücretsiz:
                                          opensubtitles.com → Consumers)
"""

import argparse
import difflib
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import supabase_client as sb
from main import run_analysis, ROOT
from srt_parser import parse_srt

SUBTITLES_DIR = ROOT / "data" / "subtitles"
USER_AGENT = "AileyleNeIzlenir v0.1"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    env_file = ROOT / ".env.local"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip()
    return env


ENV = load_env()


def http_json(url: str, headers: dict, data: dict | None = None) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode() if data else None,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json", **headers},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


# ── TMDB: film adı + süre ────────────────────────────────────────────
def tmdb_movie(tmdb_id: int) -> dict | None:
    key, token = ENV.get("TMDB_API_KEY"), ENV.get("TMDB_ACCESS_TOKEN")
    if not key and not token:
        print("! .env.local içinde TMDB anahtarı yok.")
        return None
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        url += f"?api_key={key}"
    try:
        return http_json(url, headers)
    except Exception as e:
        print(f"! TMDB hatası: {e}")
        return None


# ── OpenSubtitles: giriş + ara + indir ───────────────────────────────
_TOKEN: str | None = None


def login_token(api_key: str) -> str | None:
    """İndirme için oturum jetonu alır (API: arama anahtarla, indirme girişle)."""
    global _TOKEN
    if _TOKEN:
        return _TOKEN
    user = ENV.get("OPENSUBTITLES_USERNAME")
    password = ENV.get("OPENSUBTITLES_PASSWORD")
    if not user or not password:
        print("! OPENSUBTITLES_USERNAME / OPENSUBTITLES_PASSWORD tanımlı değil "
              "(indirme için üyelik girişi şart).")
        return None
    try:
        result = http_json(
            "https://api.opensubtitles.com/api/v1/login",
            {"Api-Key": api_key, "Content-Type": "application/json"},
            {"username": user, "password": password},
        )
        _TOKEN = result.get("token")
        if not _TOKEN:
            print(f"! OpenSubtitles girişi reddedildi: {result}")
        return _TOKEN
    except Exception as e:
        print(f"! OpenSubtitles girişi başarısız: {e}")
        return None


def plausible_result(attrs: dict, movie: dict | None) -> bool:
    """İndirmeden önce bariz uyumsuz altyazıları ele (kota koruması).

    OpenSubtitles'a yanlış film kimliğiyle yüklenmiş altyazılar olabiliyor
    (örn. vizyondaki bir filme dizi bölümü altyazısı).
    """
    release = attrs.get("release") or ""
    # Dizi bölümü kalıbı: S01E101, s2e4, 1x05…
    if re.search(r"\bS\d{1,2}[._ ]?E\d{1,3}\b|\b\d{1,2}x\d{2}\b", release, re.I):
        return False
    details = attrs.get("feature_details") or {}
    if movie:
        movie_year = (movie.get("release_date") or "")[:4]
        sub_year = str(details.get("year") or "")
        if movie_year.isdigit() and sub_year.isdigit() and abs(int(sub_year) - int(movie_year)) > 1:
            return False
        a = (movie.get("title") or "").lower()
        b = (details.get("title") or details.get("movie_name") or "").lower()
        if a and b and a not in b and b not in a:
            if difflib.SequenceMatcher(None, a, b).ratio() < 0.5:
                return False
    return True


def duration_matches(srt_path: Path, runtime_minutes: int | None) -> bool:
    """İndirilen altyazının süresi film süresiyle kabaca uyuşmalı."""
    if not runtime_minutes:
        return True
    try:
        cues = parse_srt(str(srt_path))
        if not cues:
            return False
        subtitle_minutes = cues[-1].end / 60
        return 0.5 * runtime_minutes <= subtitle_minutes <= 1.8 * runtime_minutes
    except Exception:
        return False


def find_and_download_subtitle(
    tmdb_id: int, movie: dict | None
) -> tuple[Path, str] | str | None:
    """Uyumlu ve popüler bir İngilizce altyazı indirir.

    Dönüş: (dosya, sürüm adı) başarıda, "quota" kota dolduğunda,
    "network" geçici ağ/servis sorununda (sonra yeniden denenir),
    None altyazı GERÇEKTEN bulunamadığında.
    """
    global _TOKEN
    api_key = ENV.get("OPENSUBTITLES_API_KEY")
    if not api_key:
        print("! OPENSUBTITLES_API_KEY tanımlı değil (opensubtitles.com → Consumers).")
        return None
    headers = {"Api-Key": api_key, "Content-Type": "application/json"}
    # DİKKAT: parametreler alfabetik sıralı olmalı — API aksi halde 301
    # yönlendirmesi yapıyor ve Python yönlendirmede Api-Key başlığını düşürüyor.
    query = urllib.parse.urlencode(
        sorted(
            {"tmdb_id": tmdb_id, "languages": "en", "order_by": "download_count"}.items()
        )
    )
    try:
        search = http_json(
            f"https://api.opensubtitles.com/api/v1/subtitles?{query}", headers
        )
        results = search.get("data") or []
        candidates = [
            r["attributes"] for r in results if plausible_result(r["attributes"], movie)
        ]
        skipped = len(results) - len(candidates)
        if skipped:
            print(f"  ({skipped} uyumsuz görünen altyazı elendi)")
        if not candidates:
            return None
        token = login_token(api_key)
        if not token:
            # Giriş sorunu (ağ ya da yapılandırma) "altyazı yok" değildir
            return "network"

        runtime = (movie or {}).get("runtime")
        # Kota koruması: en fazla 2 indirme dene
        for attrs in candidates[:2]:
            release = attrs.get("release") or "Bilinmeyen sürüm"
            file_id = attrs["files"][0]["file_id"]
            try:
                download = http_json(
                    "https://api.opensubtitles.com/api/v1/download",
                    {**headers, "Authorization": f"Bearer {token}"},
                    {"file_id": file_id},
                )
            except urllib.error.HTTPError as e:
                # Kota dolduğunda API 406 döndürür — bunu "bulunamadı" sanma
                if e.code in (402, 406, 429):
                    print(f"! Günlük indirme kotası dolu (HTTP {e.code}).")
                    return "quota"
                if e.code == 401:
                    # Oturum jetonu ~24 saatte doluyor; sıfırla ki bir sonraki
                    # denemede yeniden giriş yapılsın
                    _TOKEN = None
                    print("! Oturum süresi dolmuş; yeniden giriş yapılıp denenecek.")
                    return "network"
                raise
            link = download.get("link")
            if not link:
                print(f"! İndirme reddedildi (kota dolu): {download.get('message', download)}")
                return "quota"
            SUBTITLES_DIR.mkdir(parents=True, exist_ok=True)
            dest = SUBTITLES_DIR / f"{tmdb_id}.srt"
            req = urllib.request.Request(link, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as r:
                dest.write_bytes(r.read())
            if duration_matches(dest, runtime):
                return dest, release
            print(f"! '{release}' süresi filme uymuyor, sonraki aday deneniyor…")
            dest.unlink(missing_ok=True)
        return None
    except urllib.error.HTTPError as e:
        # Gerçek bir HTTP yanıtı: 5xx sunucu sorunudur (geçici), 4xx kalıcı
        print(f"! OpenSubtitles HTTP hatası: {e}")
        return "network" if e.code >= 500 else None
    except Exception as e:
        # DNS/bağlantı kopması, zaman aşımı, bozuk yanıt… hepsi geçicidir;
        # "altyazı bulunamadı" diye kalıcı işaretlemek yanlış olur (06.08 gecesi
        # ağ kesintisi 10 talebi böyle düşürmüştü)
        print(f"! OpenSubtitles'a ulaşılamadı: {e}")
        return "network"


# ── Talep kuyruğu (Supabase) ─────────────────────────────────────────
def read_requests() -> list[dict]:
    try:
        rows = sb.request(
            "GET", "analysis_requests?select=*&order=requested_at.asc"
        ) or []
        # Kod genelinde camelCase alan adları kullanılıyor; satırları çevir
        return [
            {
                "tmdbId": r["tmdb_id"],
                "status": r.get("status"),
                "retryAt": sb.iso_to_epoch(r.get("retry_at")),
                "errorCount": r.get("error_count", 0),
                "requestCount": r.get("request_count", 1),
            }
            for r in rows
        ]
    except Exception as e:
        print(f"! Kuyruk okunamadı (Supabase): {e}")
        return []


def set_status(tmdb_id: int, status: str, **extra) -> None:
    patch: dict = {"status": status}
    if "retryAt" in extra:
        patch["retry_at"] = sb.epoch_to_iso(extra["retryAt"])
    if "errorCount" in extra:
        patch["error_count"] = extra["errorCount"]
    try:
        sb.request(
            "PATCH",
            f"analysis_requests?tmdb_id=eq.{tmdb_id}",
            body=patch,
            prefer="return=minimal",
        )
    except Exception as e:
        # Durum yazılamazsa döngü çökmesin; bir sonraki turda tekrar denenir
        print(f"! Talep durumu güncellenemedi (Supabase): {e}")


QUOTA_RETRY_SECONDS = 3600  # kota dolunca 1 saat sonra yeniden dene
ERROR_RETRY_SECONDS = 600   # ağ/işleme hatasında 10 dk sonra yeniden dene
MAX_ERROR_RETRIES = 8       # üst üste bu kadar hata sonrası pes et


def _eligible(r: dict, now: float) -> bool:
    status = r.get("status")
    if status in (None, "requested", "searching_subtitle", "analyzing"):
        return True
    if status in ("quota_exceeded", "worker_error"):
        return now >= r.get("retryAt", 0)
    return False


def _transient_failure(tmdb_id: int, reason: str) -> None:
    """Geçici hata: kısa süre sonra otomatik yeniden dene; ısrarcıysa pes et."""
    record = next(
        (r for r in read_requests() if r.get("tmdbId") == tmdb_id), None
    )
    errors = (record or {}).get("errorCount", 0) + 1
    if errors >= MAX_ERROR_RETRIES:
        set_status(tmdb_id, "subtitle_not_found", errorCount=errors)
        print(f"✗ {reason} — {errors}. denemede de olmadı, vazgeçildi "
              "(sitedeki 'Tekrar dene' ile yeniden kuyruğa alınabilir).")
    else:
        set_status(
            tmdb_id, "worker_error",
            retryAt=time.time() + ERROR_RETRY_SECONDS, errorCount=errors,
        )
        print(f"✗ {reason}; {ERROR_RETRY_SECONDS // 60} dk sonra otomatik "
              f"yeniden denenecek ({errors}/{MAX_ERROR_RETRIES}).")


def process_queue(use_ollama: bool, model: str, delete_srt: bool = False) -> None:
    now = time.time()
    pending = [r for r in read_requests() if _eligible(r, now)]
    if not pending:
        print("Bekleyen talep yok.")
        return
    for request in pending:
        tmdb_id = request["tmdbId"]
        movie = tmdb_movie(tmdb_id)
        title = (movie or {}).get("title", f"tmdb:{tmdb_id}")
        print(f"\n── {title} ({tmdb_id}) işleniyor…")

        set_status(tmdb_id, "searching_subtitle")
        found = find_and_download_subtitle(tmdb_id, movie)
        if found == "quota":
            set_status(tmdb_id, "quota_exceeded", retryAt=time.time() + QUOTA_RETRY_SECONDS)
            print("✗ Günlük kota dolu; talep bekletiliyor, 1 saat sonra otomatik denenecek.")
            continue
        if found == "network":
            _transient_failure(tmdb_id, "Ağ/servis sorunu")
            continue
        if found is None:
            set_status(tmdb_id, "subtitle_not_found")
            print("✗ Altyazı bulunamadı; talep 'Altyazı bulunamadı' olarak işaretlendi.")
            continue

        srt_path, release = found
        set_status(tmdb_id, "analyzing")
        try:
            run_analysis(
                tmdb_id,
                str(srt_path),
                language="en",
                version=release,
                runtime=(movie or {}).get("runtime"),
                use_ollama=use_ollama,
                model=model,
            )
            if delete_srt:
                srt_path.unlink(missing_ok=True)
                print("✓ SRT dosyası silindi (--delete-srt).")
        except Exception as e:
            _transient_failure(tmdb_id, f"Analiz hatası: {e}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Analiz talep kuyruğu işçisi")
    ap.add_argument("--loop", type=int, default=None, metavar="SANIYE",
                    help="Verilen aralıkla sürekli kontrol et")
    ap.add_argument("--use-ollama", action="store_true")
    ap.add_argument("--model", default="llama3.2:3b")
    ap.add_argument("--delete-srt", action="store_true",
                    help="Analiz sonrası SRT'yi sil (varsayılan: sakla — "
                         "yeniden analizde indirme kotasından tasarruf sağlar)")
    args = ap.parse_args()

    if args.loop:
        print(f"İşçi çalışıyor, her {args.loop} sn'de kuyruk kontrol edilecek (Ctrl+C ile durdur).")
        while True:
            process_queue(args.use_ollama, args.model, args.delete_srt)
            time.sleep(args.loop)
    else:
        process_queue(args.use_ollama, args.model, args.delete_srt)


if __name__ == "__main__":
    main()
