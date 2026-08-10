"""data/*.json dosyalarındaki veriyi Supabase'e taşıyan tek seferlik betik.

Upsert kullanır; tekrar çalıştırmak güvenlidir (var olan kayıtları günceller).
Dosyaları SİLMEZ — yerel JSON'lar yedek olarak kalır.

Kullanım: python3 scripts/migrate_to_supabase.py
"""

import json
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in (ROOT / ".env.local").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    return env


ENV = load_env()
URL = ENV["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]


def upsert(table: str, rows: list[dict]) -> None:
    if not rows:
        print(f"  {table}: taşınacak kayıt yok")
        return
    req = urllib.request.Request(
        f"{URL}/rest/v1/{table}",
        method="POST",
        data=json.dumps(rows).encode(),
        headers={
            "apikey": KEY,
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        assert r.status in (200, 201), r.status
    print(f"  {table}: {len(rows)} kayıt yazıldı")


def epoch_to_iso(ts: float | None) -> str | None:
    if not ts:
        return None
    return datetime.fromtimestamp(ts, timezone.utc).isoformat()


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        return default


def as_uuid(value: str) -> str:
    """UUID olmayan eski kimlikleri (ör. "seed-1") deterministik UUID'ye çevir."""
    try:
        return str(uuid.UUID(value))
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, f"aileyle:{value}"))


# ── Yorumlar ─────────────────────────────────────────────────────────
comments = read_json(DATA / "comments.json", [])
upsert("comments", [
    {
        "id": as_uuid(c["id"]),
        "tmdb_id": c["tmdbId"],
        "name": c.get("name", ""),
        "liked": c.get("liked"),
        "risk_vote": c.get("riskVote"),
        "text": c.get("text", ""),
        "owner_token": c.get("ownerToken"),
        "created_at": c["createdAt"],
        "updated_at": c.get("updatedAt"),
    }
    for c in comments
])

# ── Analiz talepleri ─────────────────────────────────────────────────
requests = read_json(DATA / "analysis-requests.json", [])
upsert("analysis_requests", [
    {
        "tmdb_id": r["tmdbId"],
        "requested_at": r["requestedAt"],
        "request_count": r.get("requestCount", 1),
        "status": r.get("status") or "requested",
        "retry_at": epoch_to_iso(r.get("retryAt")),
        "error_count": r.get("errorCount", 0),
    }
    for r in requests
])

# ── Analiz sonuçları ─────────────────────────────────────────────────
analyses = []
for f in sorted((DATA / "analyses").glob("*.json")):
    data = json.loads(f.read_text())
    analyses.append({"tmdb_id": data["tmdbId"], "data": data})
upsert("analyses", analyses)

# ── İzleme listeleri ─────────────────────────────────────────────────
watchlists = read_json(DATA / "watchlists.json", {})
upsert("watchlists", [
    {"token": token, "tmdb_id": e["tmdbId"], "added_at": e["addedAt"]}
    for token, entries in watchlists.items()
    for e in entries
])

print("Bitti — yerel data/ dosyaları yedek olarak yerinde duruyor.")
