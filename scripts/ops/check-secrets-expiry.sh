#!/usr/bin/env bash
# Check config/secrets-lifecycle.json for upcoming key expiry / review due dates.
# Notifies Discord when within warn_days. Never prints secret values.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INVENTORY="${SECRETS_LIFECYCLE_FILE:-$ROOT/config/secrets-lifecycle.json}"
DRY_RUN=false
STRICT=false
TODAY="$(date -u +%Y-%m-%d)"

usage() {
  cat <<EOF
Usage: ./scripts/ops/check-secrets-expiry.sh [--dry-run] [--strict]

Reads $INVENTORY (dates only; no secret values).
Warns when expires_on or review window is within configured warn_days.
Discord via ./scripts/notify-discord.sh (no-op if webhook missing).

  --dry-run   Print warnings; do not call Discord
  --strict    Exit 1 if any secret is expired
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --strict) STRICT=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if [[ ! -f "$INVENTORY" ]]; then
  echo "Missing inventory: $INVENTORY" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 required" >&2
  exit 1
fi

TMP_JSON="$(mktemp)"
trap 'rm -f "$TMP_JSON"' EXIT

SECRETS_LIFECYCLE_FILE="$INVENTORY" TODAY_UTC="$TODAY" python3 - >"$TMP_JSON" <<'PY'
import json, os, sys
from datetime import date, timedelta

path = os.environ["SECRETS_LIFECYCLE_FILE"]
today = date.fromisoformat(os.environ["TODAY_UTC"])
with open(path, encoding="utf-8") as f:
    data = json.load(f)

default_warn = data.get("notify", {}).get("default_warn_days", [30, 14, 7, 1])
alerts = []
expired = []

def parse_d(value):
    if not value:
        return None
    return date.fromisoformat(value)

for item in data.get("secrets", []):
    sid = item.get("id") or item.get("name")
    name = item.get("name", sid)
    warn_days = sorted({int(w) for w in (item.get("warn_days") or default_warn)}, reverse=True)
    expires = parse_d(item.get("expires_on"))
    created = parse_d(item.get("created_on"))
    last_rev = parse_d(item.get("last_reviewed_on"))
    review_every = item.get("review_every_days")
    impact = item.get("impact_if_expired") or ""
    runbook = item.get("rotation_runbook") or "docs/runbooks/SECRETS-KEY-MANAGEMENT.md"

    due_date = None
    kind = None
    if expires is not None:
        due_date = expires
        kind = "expires"
    elif review_every and isinstance(review_every, int) and review_every > 0:
        base = last_rev or created
        if base is not None:
            due_date = base + timedelta(days=int(review_every))
            kind = "review_due"

    if due_date is None:
        continue

    delta = (due_date - today).days
    payload = {
        "id": sid,
        "name": name,
        "kind": kind,
        "due": due_date.isoformat(),
        "days": delta,
        "impact": impact,
        "runbook": runbook,
    }
    if delta < 0:
        expired.append(payload)
        continue

    hit = None
    for warn in warn_days:
        if delta <= warn:
            hit = warn
    if hit is None:
        continue
    payload["warn_hit"] = hit
    alerts.append(payload)

json.dump({"alerts": alerts, "expired": expired, "today": today.isoformat()}, sys.stdout)
PY

ALERT_COUNT="$(python3 -c 'import json; d=json.load(open("'"$TMP_JSON"'")); print(len(d["alerts"])+len(d["expired"]))')"
echo "secrets-expiry: today=${TODAY} findings=${ALERT_COUNT}"

if [[ "$ALERT_COUNT" == "0" ]]; then
  echo "ok — no keys within warn window"
  exit 0
fi

MESSAGE="$(
  python3 - <<PY
import json
d = json.load(open("$TMP_JSON"))
lines = []
for e in d.get("expired", []):
    lines.append(
        f"EXPIRED {e['name']} ({e['kind']}) due {e['due']} ({e['days']}d) — {e.get('impact','')} → {e.get('runbook','')}"
    )
for a in d.get("alerts", []):
    label = "EXPIRES" if a["kind"] == "expires" else "REVIEW"
    lines.append(
        f"{label} {a['name']} in {a['days']}d (warn≤{a['warn_hit']}d) due {a['due']} — {a.get('impact','')} → {a.get('runbook','')}"
    )
print("\n".join(lines))
PY
)"

echo "$MESSAGE"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] skip Discord"
else
  TITLE="🔑 Secrets lifecycle — aviso anticipado"
  TYPE="warning"
  if python3 -c 'import json; d=json.load(open("'"$TMP_JSON"'")); raise SystemExit(0 if d.get("expired") else 1)'; then
    TITLE="🚨 Secrets lifecycle — KEY EXPIRADA"
    TYPE="error"
  fi
  "$ROOT/scripts/notify-discord.sh" "$TITLE" "$MESSAGE" "$TYPE" || true
fi

if [[ "$STRICT" == "true" ]]; then
  if python3 -c 'import json; d=json.load(open("'"$TMP_JSON"'")); raise SystemExit(0 if d.get("expired") else 1)'; then
    exit 1
  fi
fi

exit 0
