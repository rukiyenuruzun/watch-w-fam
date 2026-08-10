"""Kelime listesi ve kalıp tabanlı içerik tespiti (Adım 6 + Adım 7'nin sezgisel hali).

Küfür tespiti kelime listesiyle (belgedeki yaklaşım), cinsel konuşma/ima
tespiti şimdilik kalıp listesiyle yapılır; Ollama kurulunca --use-ollama
bayrağı bu adayları dil modelinden geçirip iyileştirir.

Not: Listeler İngilizce altyazılar içindir (belge: "İlk aşamada İngilizce
altyazılarla başlamak teknik olarak daha kolaydır").
"""

import re
from dataclasses import dataclass

from srt_parser import Cue

# ── Küfür listesi: kalıp → şiddet (1 hafif, 2 orta, 3 ağır) ──────────
PROFANITY: list[tuple[re.Pattern, int]] = [
    (re.compile(p, re.I), sev)
    for p, sev in [
        # ağır
        (r"\bf+u+c+k\w*", 3),
        (r"\bmotherfuck\w*", 3),
        (r"\bcunt\w*", 3),
        (r"\bcocksuck\w*", 3),
        # orta
        (r"\bshit\w*", 2),
        (r"\bbitch\w*", 2),
        (r"\basshole\w*", 2),
        (r"\bbastard\w*", 2),
        (r"\bdickhead\w*", 2),
        (r"\bdick\b", 2),
        (r"\bprick\b", 2),
        (r"\bbullshit\w*", 2),
        (r"\bgoddamn\w*", 2),
        (r"\bpussy\b", 2),
        (r"\bwhore\w*", 2),
        (r"\bslut\w*", 2),
        (r"\bdouche\w*", 2),
        # hafif
        (r"\bdamn\b", 1),
        (r"\bhell\b", 1),
        (r"\bass\b", 1),
        (r"\bcrap\w*", 1),
        (r"\bpiss\w*", 1),
        (r"\bjackass\b", 1),
        (r"\bdumbass\b", 1),
        (r"\bscrew (you|him|her|them)\b", 1),
    ]
]

# ── Cinsellik içeren konuşma: sahne değil, konuşma konusu cinsellik ──
SEXUAL_DIALOGUE: list[re.Pattern] = [
    re.compile(p, re.I)
    for p in [
        r"\bsex\b",
        r"\bhav(e|ing) sex\b",
        r"\bhad sex\b",
        r"\bmak(e|ing) love\b",
        r"\bmade love\b",
        r"\borgasm\w*",
        r"\bnaked\b",
        r"\bvirgin\b",
        r"\bcondom\w*",
        r"\bblow ?job\w*",
        r"\bhorny\b",
        r"\bget(ting)? laid\b",
        r"\berection\b",
        r"\bforeplay\b",
    ]
]

# ── Cinsel ima kalıpları: (kalıp, şiddet) ────────────────────────────
SEXUAL_IMPLICATION: list[tuple[re.Pattern, int]] = [
    (re.compile(p, re.I), sev)
    for p, sev in [
        (r"\bspend the night\b", 2),
        (r"\bstay the night\b", 2),
        (r"\bsle(ep|pt) together\b", 2),
        (r"\bsle(ep|pt) with (me|you|him|her)\b", 2),
        (r"\bone[- ]night stand\b", 2),
        (r"\bin bed together\b", 2),
        (r"\bnight together\b", 2),
        (r"\bcome upstairs\b", 1),
        (r"\bcome up for\b", 1),
        (r"\byour place or mine\b", 1),
        (r"\btake (this|that|it) off\b", 1),
        (r"\btake off your\b", 1),
        (r"\bhook(ed)? up\b", 1),
    ]
]


@dataclass
class Hit:
    category: str  # profanity | sexual_dialogue | sexual_implication
    cue: Cue
    severity: int
    confidence: float
    matches: list[str]


def detect(cues: list[Cue]) -> list[Hit]:
    hits: list[Hit] = []
    for cue in cues:
        # küfür: tüm eşleşmeleri topla, şiddet = en ağırı
        prof_matches: list[str] = []
        prof_sev = 0
        for pattern, sev in PROFANITY:
            found = pattern.findall(cue.text)
            if found:
                prof_matches += [f if isinstance(f, str) else f[0] for f in found]
                prof_sev = max(prof_sev, sev)
        if prof_matches:
            hits.append(
                Hit("profanity", cue, prof_sev, 0.92, prof_matches)
            )

        dlg = [p.pattern for p in SEXUAL_DIALOGUE if p.search(cue.text)]
        if dlg:
            hits.append(Hit("sexual_dialogue", cue, 2, 0.7, dlg))
            continue  # aynı cümleyi bir de ima olarak sayma

        impl_sev = 0
        impl: list[str] = []
        for pattern, sev in SEXUAL_IMPLICATION:
            if pattern.search(cue.text):
                impl.append(pattern.pattern)
                impl_sev = max(impl_sev, sev)
        if impl:
            hits.append(Hit("sexual_implication", cue, impl_sev, 0.55, impl))
    return hits


def merge_hits(hits: list[Hit], max_gap_seconds: float = 20) -> list[dict]:
    """Aynı kategoride birbirine yakın vuruşları tek olayda birleştirir
    (belge: "Benzer sonuçları birleştirmek")."""
    events: list[dict] = []
    by_category: dict[str, list[Hit]] = {}
    for h in sorted(hits, key=lambda h: h.cue.start):
        by_category.setdefault(h.category, []).append(h)

    for category, group in by_category.items():
        current: list[Hit] = []
        for h in group:
            if current and h.cue.start - current[-1].cue.end > max_gap_seconds:
                events.append(_to_event(category, current))
                current = []
            current.append(h)
        if current:
            events.append(_to_event(category, current))
    return sorted(events, key=lambda e: e["startSeconds"])


def _to_event(category: str, group: list[Hit]) -> dict:
    n = sum(len(h.matches) for h in group)
    descriptions = {
        "profanity": {
            "tr": f"Küfür/argo içeren konuşma ({n} kullanım)",
            "en": f"Dialogue containing profanity ({n} use{'s' if n > 1 else ''})",
        },
        "sexual_dialogue": {
            "tr": "Cinsellik içeren konuşma",
            "en": "Sexually explicit dialogue",
        },
        "sexual_implication": {
            "tr": "Cinsel ima içeren konuşma",
            "en": "Dialogue with sexual implication",
        },
    }
    return {
        "category": category,
        "startSeconds": int(group[0].cue.start),
        "endSeconds": int(group[-1].cue.end),
        "severity": max(h.severity for h in group),
        "confidence": round(min(h.confidence for h in group), 2),
        "description": descriptions[category],
        "matchCount": n,
    }
