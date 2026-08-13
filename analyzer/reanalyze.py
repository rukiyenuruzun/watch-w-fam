"""Arşivdeki filmleri YEREL altyazılardan yeniden analiz eder.

Dedektör kuralları ya da şiddet kademeleri değiştiğinde eski sonuçlar
elde kalmasın diye kullanılır. Altyazılar data/subtitles/ içinde durduğu
için OpenSubtitles indirme kotası harcanmaz.

Kullanım:
    python3 analyzer/reanalyze.py --dry-run     # neyin değişeceğini göster
    python3 analyzer/reanalyze.py               # hepsini yeniden yaz
    python3 analyzer/reanalyze.py --only 11036  # tek film
"""

import argparse
import json
from pathlib import Path

from main import ROOT, run_analysis

SUBTITLES_DIR = ROOT / "data" / "subtitles"
ANALYSES_DIR = ROOT / "data" / "analyses"


def main() -> None:
    ap = argparse.ArgumentParser(description="Yerel altyazılardan yeniden analiz")
    ap.add_argument("--dry-run", action="store_true", help="Yazmadan karşılaştır")
    ap.add_argument("--only", type=int, default=None, help="Tek TMDB kimliği")
    ap.add_argument("--use-ollama", action="store_true")
    ap.add_argument("--model", default="llama3.2:3b")
    args = ap.parse_args()

    done = skipped = 0
    for path in sorted(ANALYSES_DIR.glob("*.json")):
        tmdb_id = int(path.stem)
        if args.only and tmdb_id != args.only:
            continue
        srt = SUBTITLES_DIR / f"{tmdb_id}.srt"
        if not srt.exists():
            print(f"– {tmdb_id}: yerel altyazı yok, atlandı")
            skipped += 1
            continue

        old = json.loads(path.read_text())
        if args.dry_run:
            # Yazmadan yalnızca olay sayısı/şiddet toplamını karşılaştır
            from detectors import detect, merge_hits
            from srt_parser import parse_srt

            events = merge_hits(detect(parse_srt(srt)))
            old_load = sum(e["severity"] for e in old["events"])
            new_load = sum(e["severity"] for e in events)
            print(
                f"  {tmdb_id}: olay {len(old['events'])}→{len(events)}, "
                f"şiddet toplamı {old_load}→{new_load}"
            )
        else:
            run_analysis(
                tmdb_id,
                str(srt),
                language=old.get("subtitleLanguage", "en"),
                version=old.get("subtitleVersion", "Bilinmeyen sürüm"),
                runtime=old.get("referenceRuntimeMinutes"),
                use_ollama=args.use_ollama,
                model=args.model,
            )
        done += 1

    print(f"\n{done} film işlendi, {skipped} atlandı.")


if __name__ == "__main__":
    main()
