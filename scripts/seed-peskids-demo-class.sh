#!/usr/bin/env bash
set -euo pipefail

# Seed a demo scheduled class for Peskids operations MVP (idempotent).
# BLOCKED unless PESKIDS_ALLOW_DEMO_SEED=1.
# Requires pools (seed-peskids-pools.sh) and migration 010 grants applied.
# Usage: PESKIDS_ALLOW_DEMO_SEED=1 doppler run --config stg -- ./scripts/seed-peskids-demo-class.sh [--dry-run]

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/peskids-demo-seed-guard.sh
source "${ROOT}/scripts/lib/peskids-demo-seed-guard.sh"
peskids_require_demo_seed_allow "./scripts/seed-peskids-demo-class.sh" || exit 1

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

TENANT_SLUG="${NEXT_PUBLIC_TENANT_ID:-peskids}"
OWNER_EMAIL="${PESKIDS_OWNER_EMAIL:-sierrasantiago90@gmail.com}"
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  echo "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" >&2
  exit 1
fi

REST_HEADERS=(
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}"
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
  -H "Content-Type: application/json"
  -H "Accept-Profile: peskids"
  -H "Content-Profile: peskids"
)

existing_classes() {
  curl -sS "${REST_HEADERS[@]}" \
    "${SUPABASE_URL}/rest/v1/classes?tenant_slug=eq.${TENANT_SLUG}&status=eq.scheduled&select=id,title&limit=5"
}

CLASS_ROWS="$(existing_classes || echo '[]')"
if ! echo "$CLASS_ROWS" | jq -e 'type == "array"' >/dev/null 2>&1; then
  echo "Unexpected classes response:" >&2
  echo "$CLASS_ROWS" >&2
  exit 1
fi

if [[ "$(echo "$CLASS_ROWS" | jq 'length')" -ge 1 ]]; then
  echo "Demo class already present:"
  echo "$CLASS_ROWS" | jq -r '.[] | "- \(.title) (\(.id))"'
  exit 0
fi

POOL_ID="$(curl -sS "${REST_HEADERS[@]}" \
  "${SUPABASE_URL}/rest/v1/pools?tenant_slug=eq.${TENANT_SLUG}&active=eq.true&select=id,name&order=name.asc&limit=1" \
  | jq -r '.[0].id // empty')"

if [[ -z "$POOL_ID" ]]; then
  echo "No active pool found. Run ./scripts/seed-peskids-pools.sh first." >&2
  exit 1
fi

PROFESSOR_USER_ID="${PESKIDS_DEMO_PROFESSOR_USER_ID:-}"
if [[ -z "$PROFESSOR_USER_ID" ]]; then
  USERS_JSON="$(curl -sS \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    "${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000")"
  PROFESSOR_USER_ID="$(echo "$USERS_JSON" | jq -r --arg email "$OWNER_EMAIL" \
    '.users[]? | select((.email // "" | ascii_downcase) == ($email | ascii_downcase)) | .id' \
    | head -n 1)"
fi

if [[ -z "$PROFESSOR_USER_ID" ]]; then
  echo "Could not resolve professor user id for ${OWNER_EMAIL}. Set PESKIDS_DEMO_PROFESSOR_USER_ID." >&2
  exit 1
fi

# Next Saturday 09:00–10:00 America/Bogota (stored as UTC ISO)
if date -u -v+Sat +%Y-%m-%d >/dev/null 2>&1; then
  DEMO_DATE="$(date -u -v+Sat +%Y-%m-%d)"
else
  DEMO_DATE="$(python3 - <<'PY'
from datetime import date, timedelta
today = date.today()
days_ahead = (5 - today.weekday()) % 7 or 7
print((today + timedelta(days=days_ahead)).isoformat())
PY
)"
fi

STARTS_AT="${DEMO_DATE}T14:00:00.000Z"
ENDS_AT="${DEMO_DATE}T15:00:00.000Z"

PAYLOAD="$(jq -n \
  --arg tenant "$TENANT_SLUG" \
  --arg pool "$POOL_ID" \
  --arg professor "$PROFESSOR_USER_ID" \
  --arg starts "$STARTS_AT" \
  --arg ends "$ENDS_AT" \
  '{
    tenant_slug: $tenant,
    title: "Delfines · sábado 9:00",
    level: 3,
    professor_user_id: $professor,
    pool_id: $pool,
    location: "llanogrande",
    starts_at: $starts,
    ends_at: $ends,
    capacity: 8,
    price_cents: 8500000,
    currency: "cop",
    status: "scheduled"
  }')"

if $DRY_RUN; then
  echo "[dry-run] Would insert demo class:"
  echo "$PAYLOAD" | jq .
  exit 0
fi

HTTP_CODE=$(curl -sS -o /tmp/peskids-seed-class.json -w '%{http_code}' \
  -X POST "${SUPABASE_URL}/rest/v1/classes" \
  "${REST_HEADERS[@]}" \
  -H "Prefer: return=representation" \
  -d "$PAYLOAD")

if [[ "$HTTP_CODE" -ge 400 ]]; then
  echo "Demo class seed failed (HTTP ${HTTP_CODE}):" >&2
  cat /tmp/peskids-seed-class.json >&2 || true
  exit 1
fi

echo "Demo class created:"
cat /tmp/peskids-seed-class.json | jq -r '.[0] | "- \(.title) (\(.id)) \(.starts_at)"'
