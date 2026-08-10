"""Ollama ile sınıflandırma iyileştirmesi (Adım 7).

Ollama kuruluysa (https://ollama.com — `curl -fsSL https://ollama.com/install.sh | sh`
sonra `ollama pull llama3.2:3b`) main.py --use-ollama bayrağıyla çalışır:
kalıp tabanlı bulunan cinsel konuşma/ima adaylarını dil modelinden geçirir,
kategori/şiddet/güveni düzeltir ve kısa tarafsız açıklama üretir.
Belgedeki gibi modelden yapılandırılmış JSON istenir.
"""

import json
import urllib.request

OLLAMA_URL = "http://localhost:11434"

PROMPT = """You label movie subtitle lines for a family-viewing content guide.
Given the subtitle text, respond ONLY with JSON:
{"category": "sexual_dialogue" | "sexual_implication" | "none",
 "severity": 1 | 2 | 3,
 "confidence": 0.0-1.0,
 "description_en": "short neutral description",
 "description_tr": "kısa tarafsız Türkçe açıklama"}

"sexual_dialogue" = characters explicitly talk about sex.
"sexual_implication" = sex is implied but not stated.
"none" = neither.

Subtitle: {text}"""


def available(model: str) -> bool:
    try:
        with urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=3) as r:
            tags = json.load(r)
        return any(m.get("name", "").startswith(model.split(":")[0]) for m in tags.get("models", []))
    except Exception:
        return False


def classify(text: str, model: str) -> dict | None:
    payload = {
        "model": model,
        "prompt": PROMPT.replace("{text}", text),
        "stream": False,
        "format": "json",
        "options": {"temperature": 0},
    }
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body = json.load(r)
        result = json.loads(body.get("response", "{}"))
        if result.get("category") in ("sexual_dialogue", "sexual_implication", "none"):
            return result
    except Exception:
        pass
    return None
