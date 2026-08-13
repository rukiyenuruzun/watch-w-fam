"""Analiz programı (belgedeki Adım 5-8'in dosya tabanlı hali).

Kullanım:
    python3 analyzer/main.py --tmdb-id 550 --srt film.srt \
        --version WEB-DL --runtime 139 [--use-ollama]

Sonuç <proje>/data/analyses/<tmdbId>.json dosyasına yazılır; site bu
dosyayı otomatik okur. Supabase kurulunca bu çıktı oraya taşınacak.
Bekleyen talep varsa analysis-requests.json'dan düşülür.
"""

import argparse
import json
from pathlib import Path

from srt_parser import parse_srt
from detectors import detect, merge_hits
import ollama_client
import supabase_client as sb

ROOT = Path(__file__).resolve().parents[1]
ANALYSES_DIR = ROOT / "data" / "analyses"
REQUESTS_FILE = ROOT / "data" / "analysis-requests.json"


# Model istem şablonunu papağan gibi tekrarladığında bu metinler geri gelir;
# açıklama diye yazılırlarsa sitede "kisa tarafsız Türkçe açıklama" görünür
PLACEHOLDER_DESCRIPTIONS = {
    "short neutral description",
    "kısa tarafsız türkçe açıklama",
    "kisa tarafsız türkçe açıklama",
    "kisa tarafsiz turkce aciklama",
}


def refine_with_ollama(events: list[dict], model: str) -> list[dict]:
    """Kalıp tabanlı cinsel konuşma/ima olaylarını dil modelinden geçirir.

    Modele olayın açıklaması değil GERÇEK replik gönderilir; aksi hâlde model
    kendi etiketini ("Sexually explicit dialogue") okuyup her olayı en yüksek
    şiddetle onaylıyordu.
    """
    if not ollama_client.available(model):
        print(f"! Ollama ya da '{model}' modeli bulunamadı, sezgisel sonuçlar korunuyor.")
        return events
    refined: list[dict] = []
    for e in events:
        if e["category"] not in ("sexual_dialogue", "sexual_implication"):
            refined.append(e)
            continue
        text = e.get("_text")
        if not text:
            # Replik elde yoksa modele sorulacak bir şey yok; sezgisel sonuç kalır
            refined.append(e)
            continue
        result = ollama_client.classify(text, model)
        if result is None:
            refined.append(e)
        elif result["category"] == "none":
            continue  # model reddetti, olayı at
        else:
            e["category"] = result["category"]
            severity = int(result.get("severity", e["severity"]))
            # Model her şeye 3 verme eğiliminde; sezgisel şiddetten en fazla
            # bir kademe sapmasına izin verilir
            e["severity"] = max(1, min(3, severity, e["severity"] + 1))
            e["confidence"] = round(float(result.get("confidence", e["confidence"])), 2)
            desc_en = (result.get("description_en") or "").strip()
            desc_tr = (result.get("description_tr") or "").strip()
            if (
                desc_en
                and desc_tr
                and desc_en.lower() not in PLACEHOLDER_DESCRIPTIONS
                and desc_tr.lower() not in PLACEHOLDER_DESCRIPTIONS
            ):
                e["description"] = {"tr": desc_tr, "en": desc_en}
            refined.append(e)
    return refined


def run_analysis(
    tmdb_id: int,
    srt_path: str,
    language: str = "en",
    version: str = "Bilinmeyen sürüm",
    runtime: int | None = None,
    use_ollama: bool = False,
    model: str = "llama3.2:3b",
) -> dict:
    """SRT'yi analiz eder, sonucu data/analyses/<id>.json'a yazar ve döndürür.

    Hem CLI (main) hem otomatik işçi (worker.py) bu fonksiyonu kullanır.
    """
    cues = parse_srt(srt_path)
    if not cues:
        raise ValueError("Altyazı ayrıştırılamadı ya da boş.")
    print(f"✓ {len(cues)} altyazı satırı ayrıştırıldı.")

    hits = detect(cues)
    events = merge_hits(hits)
    if use_ollama:
        events = refine_with_ollama(events, model)

    runtime = runtime or (int(cues[-1].end // 60) + 1)
    analysis = {
        "tmdbId": tmdb_id,
        "status": "completed",
        "subtitleLanguage": language,
        "subtitleVersion": version,
        "referenceRuntimeMinutes": runtime,
        "events": [
            {
                "id": f"auto-{tmdb_id}-{i + 1}",
                "tmdbId": tmdb_id,
                "category": e["category"],
                "startSeconds": e["startSeconds"],
                "endSeconds": e["endSeconds"],
                "severity": e["severity"],
                "confidence": e["confidence"],
                "description": e["description"],
                "source": "subtitle_auto",
                "verificationCount": 0,
            }
            for i, e in enumerate(events)
        ],
    }

    # Yerel JSON her zaman yazılır (yedek); site artık Supabase'den okuyor
    ANALYSES_DIR.mkdir(parents=True, exist_ok=True)
    out = ANALYSES_DIR / f"{tmdb_id}.json"
    out.write_text(json.dumps(analysis, ensure_ascii=False, indent=2))

    if sb.configured():
        # Yazma başarısız olursa bilerek hata fırlatılır: worker talebi
        # "geçici hata" sayar ve sonra yeniden dener (sonuç kaybolmaz).
        from datetime import datetime, timezone

        sb.request(
            "POST",
            "analyses",
            body=[{
                "tmdb_id": tmdb_id,
                "data": analysis,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }],
            prefer="resolution=merge-duplicates,return=minimal",
        )
        sb.request("DELETE", f"analysis_requests?tmdb_id=eq.{tmdb_id}")
        print("✓ Sonuç Supabase'e yazıldı, bekleyen talep kapatıldı.")
    elif REQUESTS_FILE.exists():
        # Supabase yapılandırılmamışsa eski dosya temelli kuyruk kapatma
        requests = json.loads(REQUESTS_FILE.read_text())
        remaining = [r for r in requests if r.get("tmdbId") != tmdb_id]
        if len(remaining) != len(requests):
            REQUESTS_FILE.write_text(json.dumps(remaining, indent=2))
            print("✓ Bekleyen analiz talebi kapatıldı.")

    counts: dict[str, int] = {}
    for e in analysis["events"]:
        counts[e["category"]] = counts.get(e["category"], 0) + 1
    print(f"✓ {len(analysis['events'])} olay bulundu: {counts or 'temiz film'}")
    print(f"✓ Yazıldı: {out}")
    return analysis


def main() -> None:
    ap = argparse.ArgumentParser(description="Altyazı tabanlı içerik analizi")
    ap.add_argument("--tmdb-id", type=int, required=True)
    ap.add_argument("--srt", required=True, help="SRT dosyası yolu")
    ap.add_argument("--language", default="en", help="Altyazı dili kodu (vars: en)")
    ap.add_argument("--version", default="Bilinmeyen sürüm", help="Altyazı sürümü (WEB-DL, Blu-ray…)")
    ap.add_argument("--runtime", type=int, default=None, help="Referans film süresi (dk)")
    ap.add_argument("--use-ollama", action="store_true", help="Adayları Ollama ile iyileştir")
    ap.add_argument("--model", default="llama3.2:3b")
    args = ap.parse_args()

    run_analysis(
        args.tmdb_id,
        args.srt,
        language=args.language,
        version=args.version,
        runtime=args.runtime,
        use_ollama=args.use_ollama,
        model=args.model,
    )


if __name__ == "__main__":
    main()
