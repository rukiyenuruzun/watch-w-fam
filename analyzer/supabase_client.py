"""Supabase REST (PostgREST) erişimi — worker ve analiz programı için.

Ek bağımlılık gerektirmez (urllib). Anahtarlar .env.local'dan okunur;
service_role anahtarı RLS'i baypas eder, yalnızca bu makinede çalışır.
"""

import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    f = ROOT / ".env.local"
    if f.exists():
        for line in f.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip()
    return env


_ENV = _load_env()
_URL = _ENV.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
_KEY = _ENV.get("SUPABASE_SERVICE_ROLE_KEY", "")


def configured() -> bool:
    return bool(_URL and _KEY)


def request(method: str, path: str, body=None, prefer: str | None = None):
    """rest/v1 altına istek atar; yanıt gövdesi varsa JSON döndürür."""
    headers = {
        "apikey": _KEY,
        "Authorization": f"Bearer {_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(
        f"{_URL}/rest/v1/{path}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers=headers,
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def iso_to_epoch(value: str | None) -> float:
    if not value:
        return 0.0
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def epoch_to_iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).isoformat()
