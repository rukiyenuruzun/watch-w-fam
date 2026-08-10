"""SRT altyazı ayrıştırıcı (Adım 5).

Harici bağımlılık yok; BOM, CRLF, çok satırlı metin ve basit HTML/ASS
etiketlerini tolere eder.
"""

import re
from dataclasses import dataclass

TIMESTAMP = re.compile(
    r"(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})"
)
TAGS = re.compile(r"<[^>]+>|\{\\[^}]*\}")


@dataclass
class Cue:
    index: int
    start: float  # saniye
    end: float
    text: str


def _seconds(h: str, m: str, s: str, ms: str) -> float:
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms.ljust(3, "0")) / 1000


def parse_srt(path: str) -> list[Cue]:
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        content = f.read()

    cues: list[Cue] = []
    # Boş satırlarla ayrılmış bloklar
    for block in re.split(r"\r?\n\r?\n+", content.strip()):
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if not lines:
            continue
        # İlk satır sıra numarası olabilir, zaman satırını bul
        ts_line = None
        for i, line in enumerate(lines):
            m = TIMESTAMP.search(line)
            if m:
                ts_line = i
                break
        if ts_line is None:
            continue
        m = TIMESTAMP.search(lines[ts_line])
        start = _seconds(m.group(1), m.group(2), m.group(3), m.group(4))
        end = _seconds(m.group(5), m.group(6), m.group(7), m.group(8))
        text = " ".join(lines[ts_line + 1 :])
        text = TAGS.sub("", text).strip()
        if text:
            cues.append(Cue(index=len(cues) + 1, start=start, end=end, text=text))
    return cues
