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

# ── Cinsellik içeren konuşma: (kalıp, şiddet) ────────────────────────
# Sahne değil, konuşmanın konusu cinsellik. Şiddet kademesi önemli:
# romantik örtmece ("make love") ile kaba/müstehcen konuşma ("blowjob")
# aynı ağırlıkta sayılırsa her aşk filmi "izlenmez" çıkıyor.
#   1 = romantik/örtmeceli anma
#   2 = açıkça seksten söz etme
#   3 = kaba, müstehcen ya da eylemi tarif eden konuşma
SEXUAL_DIALOGUE: list[tuple[re.Pattern, int]] = [
    (re.compile(p, re.I), sev)
    for p, sev in [
        # ── kaba / müstehcen / eylemi tarif eden ──
        (r"\bblow ?job\w*", 3),
        (r"\bget(ting)? laid\b", 3),
        (r"\bhorny\b", 3),
        (r"\borgasm\w*", 3),
        (r"\berection\b", 3),
        # tireli hâli şart: "I'm hard on you", "hard on younger sisters" deyim
        (r"\bhard-on\b", 3),
        (r"\bforeplay\b", 3),
        (r"\bgo(ing|es)? down on\b", 3),
        (r"\bsuck (my|your|his|her) (dick|cock|balls)\b", 3),
        (r"\bsuck (me|him) off\b", 3),
        (r"\bjerk(ing|ed)? off\b", 3),
        (r"\bhand ?job\w*", 3),
        (r"\bmasturbat\w*", 3),
        (r"\btouch(ing|ed)? (myself|himself|herself)\b", 3),
        (r"\bcum(ming|shot)?\b(?! laude)", 3),
        (r"\bdoggy ?style\b", 3),
        (r"\bporn\w*", 3),
        (r"\bkinky\b", 3),
        (r"\bfetish\w*", 3),
        (r"\bbondage\b", 3),
        (r"\bsex ?tape\b", 3),
        (r"\bnudes\b", 3),
        (r"\bsexting\b", 3),
        (r"\bbetween (my|your|her|his) legs\b", 3),
        (r"\b(his|your|my|the) (cock|dick)\b", 3),
        (r"\b(her|your|my) pussy\b", 3),
        (r"\btits\b", 3),
        (r"\bnipples?\b", 3),
        # ── açıkça seksten söz etme ──
        (r"\bhav(e|ing) sex\b", 2),
        (r"\bhad sex\b", 2),
        # "slept with X" arşivde 12 kez geçiyor ve hepsi cinsel; buna karşılık
        # "sleep with me" çoğunlukla masum ("Can you sleep with me?" — çocuk
        # yanında yatmak istiyor), o yüzden yalnızca geçmiş zamanı sayıyoruz
        (r"\bslept with\b", 2),
        (r"\btake (your|my|his|her|their) clothes off\b", 2),
        # "sex" dönem filmlerinde "cinsiyet" demek: "your own sex",
        # "the fair sex", "the entire sex" — bunlar elenir
        (
            r"(?<!own )(?<!fair )(?<!male )(?<!same )(?<!entire )(?<!weaker )"
            r"(?<!gentler )(?<!female )(?<!opposite )\bsex\b",
            2,
        ),
        (r"\bsexual\w*", 2),
        (r"\bpenetrat\w*", 2),
        (r"\bcondom\w*", 2),
        (r"\bvirginity\b", 2),
        (r"\bpenis\b", 2),
        (r"\bvagina\b", 2),
        (r"\b(her|your|my) (breasts?|boobs)\b", 2),
        # gövde değişimi/şiir dili gibi bağlamlarda yanılabilir, o yüzden 2
        (r"\b(be|been|get|was|were|is) inside (me|you|her|him)\b", 2),
        (r"\bprostitut\w*", 2),
        (r"\bhooker\w*", 2),
        (r"\bbrothel\w*", 2),
        (r"\bstrip ?club\b", 2),
        (r"\blap ?dance\b", 2),
        (r"\bstrip(per|ping|ped) (naked|down|for)\b", 2),
        (r"\bundress\w*", 2),
        (r"\baroused\b", 2),
        (r"\bturn(s|ed)? (me|her|him) on\b", 2),
        # ── romantik / örtmeceli anma ──
        (r"\bmak(e|ing) love\b", 1),
        (r"\bmade love\b", 1),
        # "naked eye" (çıplak göz) cinsel değil
        (r"\bnaked\b(?! eye)", 1),
        (r"\bnude\b", 1),
        (r"\bvirgin\b", 1),
        # Dar tutuldu: yalın "touch me" arşivde 78 kez geçiyor ve neredeyse
        # tamamı şiddet/itiraz ("Don't fucking touch me!"), cinsel değil
        (r"\b(never|ever) been touched\b", 1),
        (r"\bseduc\w*", 1),
        # "make out with" şart: dönem dilinde "make out" = anlamak, seçmek
        (r"\bmak(e|ing) out with\b", 1),
        (r"\blingerie\b", 1),
        (r"\bpanties\b", 1),
        (r"\bsexy\b", 1),
    ]
]

# ── Parantez içi ses/eylem notları (SDH altyazıları) ─────────────────
# Altyazının görsel sahneyi ele verdiği tek yer: "(MOANING)", "(KISSES)".
# İnleme sesi acı/korku sahnelerinde de geçtiği için dar bir dışlama
# listesi var; "groans/gasps/grunts" tek başına ASLA cinsel sayılmaz
# (arşivde en çok Zootopia 2'de geçiyorlar).
BRACKETED = re.compile(r"[\(\[]([^\)\]]{1,80})[\)\]]")
# Güçlü kanıt: sahnenin kendisi duyuluyor ("both moaning, grunting")
SEXUAL_SOUND_STRONG = re.compile(
    r"(\bmoan\w*\b.*\b(grunt|pant|gasp)\w*|\b(grunt|pant|gasp)\w*\b.*\bmoan\w*)"
    r"|\bboth moan|\bsex(ual)? (noise|sound|moan)|\blovemaking\b|\borgasm",
    re.I,
)
# Zayıf kanıt: tek başına inleme. Acı/korku sahnelerinde de geçtiği için
# cinsel sahne değil, yalnızca "ima" sayılır ("MOANS FAINTLY" yaralı biri
# olabilir). "groans/gasps/grunts" tek başına ASLA sayılmaz — arşivde en
# çok Zootopia 2'de geçiyorlar.
SEXUAL_SOUND_WEAK = re.compile(r"\bmoan\w*", re.I)
SEXUAL_SOUND_EXCLUDE = re.compile(
    r"ghost|people|crowd|zombie|wind|pain|hurt|injur|dying|sick|baby|wounded|"
    r"prisoner|patient|monster|creature|animal|faintly|weakly|softly in pain",
    re.I,
)
KISS_SOUND = re.compile(r"\bkiss(es|ing)?\b", re.I)

# ── Cinsel ima kalıpları: (kalıp, şiddet) ────────────────────────────
# İma zaten belirsiz olduğu için hepsi hafif. Bağlamdan kopuk olduğu için
# yanlış alarm üreten kalıplar ("take it off", "hook up", "night together",
# "come up for") listeden çıkarıldı: arşivde neredeyse tamamı cinsel
# olmayan repliklerdi ("Never take it off, it reflects light").
SEXUAL_IMPLICATION: list[tuple[re.Pattern, int]] = [
    (re.compile(p, re.I), sev)
    for p, sev in [
        (r"\bone[- ]night stand\b", 2),
        (r"\bin bed together\b", 2),
        (r"\bsle(ep|pt) together\b", 2),
        (r"\bsle(ep|pt) with (me|you|him|her)\b", 2),
        (r"\bspend the night\b", 1),
        (r"\bstay the night\b", 1),
        (r"\bcome upstairs\b", 1),
        (r"\byour place or mine\b", 1),
        (r"\btake off your (clothes|shirt|pants|dress|bra|underwear|top)\b", 1),
    ]
]


@dataclass
class Hit:
    category: str  # profanity | sexual_dialogue | sexual_implication
    cue: Cue
    severity: int
    confidence: float
    matches: list[str]


def _sound_hit(cue: Cue) -> Hit | None:
    """Parantez içi ses notundan sahne tespiti (öpüşme / cinsel sahne)."""
    for m in BRACKETED.finditer(cue.text):
        inner = m.group(1)
        if KISS_SOUND.search(inner):
            return Hit("short_kiss", cue, 1, 0.7, [inner.strip()])
        if SEXUAL_SOUND_EXCLUDE.search(inner):
            continue
        if SEXUAL_SOUND_STRONG.search(inner):
            return Hit("explicit_sexual_content", cue, 1, 0.6, [inner.strip()])
        if SEXUAL_SOUND_WEAK.search(inner):
            return Hit("sexual_implication", cue, 1, 0.4, [inner.strip()])
    return None


def detect(cues: list[Cue]) -> list[Hit]:
    hits: list[Hit] = []
    for cue in cues:
        # Ses notu varsa önce o değerlendirilir: sahnenin kendisine dair
        # kanıt, konuşmadan daha güçlüdür
        sound_hit = _sound_hit(cue)
        if sound_hit:
            hits.append(sound_hit)
            continue
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

        dlg: list[str] = []
        dlg_sev = 0
        for pattern, sev in SEXUAL_DIALOGUE:
            if pattern.search(cue.text):
                dlg.append(pattern.pattern)
                dlg_sev = max(dlg_sev, sev)
        if dlg:
            hits.append(Hit("sexual_dialogue", cue, dlg_sev, 0.7, dlg))
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
    severity = max(h.severity for h in group)
    if category == "sexual_dialogue":
        description = (
            {"tr": "Cinsellikten söz edilen konuşma", "en": "Dialogue mentioning sex"}
            if severity == 1
            else {"tr": "Açıkça cinsellik konuşuluyor", "en": "Explicit talk about sex"}
            if severity == 2
            else {"tr": "Kaba/müstehcen cinsel konuşma", "en": "Crude sexual dialogue"}
        )
    elif category == "sexual_implication":
        description = {
            "tr": "Cinsel ima içeren konuşma",
            "en": "Dialogue with sexual implication",
        }
    elif category == "explicit_sexual_content":
        description = {
            "tr": "Altyazıda cinsel sahne sesi belirtilmiş",
            "en": "Subtitle marks sounds of a sex scene",
        }
    elif category == "short_kiss":
        description = {
            "tr": "Altyazıda öpüşme belirtilmiş",
            "en": "Subtitle marks a kiss",
        }
    else:
        description = {
            "tr": f"Küfür/argo içeren konuşma ({n} kullanım)",
            "en": f"Dialogue containing profanity ({n} use{'s' if n > 1 else ''})",
        }
    return {
        "category": category,
        "startSeconds": int(group[0].cue.start),
        "endSeconds": int(group[-1].cue.end),
        "severity": severity,
        "confidence": round(min(h.confidence for h in group), 2),
        "description": description,
        "matchCount": n,
        # Ollama iyileştirmesi gerçek repliği görsün diye taşınır; JSON'a
        # yazılmadan önce main.py tarafından atılır
        "_text": " ".join(" ".join(h.cue.text.split()) for h in group)[:400],
    }
