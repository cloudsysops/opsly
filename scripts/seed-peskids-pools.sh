#!/usr/bin/env bash
set -euo pipefail

# Seed default Peskids pools for operations MVP (idempotent via PostgREST).
# BLOCKED on production, and blocked everywhere unless PESKIDS_ALLOW_DEMO_SEED=1.
# Usage:
#   PESKIDS_ALLOW_DEMO_SEED=1 doppler run --project ops-intcloudsysops --config stg -- \
#     ./scripts/seed-peskids-pools.sh [--dry-run]

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/peskids-demo-seed-guard.sh
source "${ROOT}/scripts/lib/peskids-demo-seed-guard.sh"
peskids_require_demo_seed_allow "./scripts/seed-peskids-pools.sh" || exit 1

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

TENANT_SLUG="${NEXT_PUBLIC_TENANT_ID:-peskids}"
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

count_pools() {
  curl -sS "${REST_HEADERS[@]}" \
    "${SUPABASE_URL}/rest/v1/pools?tenant_slug=eq.${TENANT_SLUG}&select=id" \
    | jq 'length'
}

POOL_COUNT="$(count_pools || echo 0)"
if [[ "$POOL_COUNT" -ge 3 ]]; then
  echo "Peskids pools already present (${POOL_COUNT} rows for ${TENANT_SLUG})"
  exit 0
fi

PAYLOAD='[
  {"tenant_slug":"'"${TENANT_SLUG}"'","name":"Piscina Llanogrande A","location":"llanogrande","max_capacity":12,"active":true},
  {"tenant_slug":"'"${TENANT_SLUG}"'","name":"Piscina Llanogrande B","location":"llanogrande","max_capacity":10,"active":true},
  {"tenant_slug":"'"${TENANT_SLUG}"'","name":"Clase domicilio","location":"domicilio","max_capacity":4,"active":true}
]'

if $DRY_RUN; then
  echo "[dry-run] Would insert 3 pools for tenant ${TENANT_SLUG} (current count: ${POOL_COUNT})"
  echo "$PAYLOAD" | jq .
  exit 0
fi

HTTP_CODE=$(curl -sS -o /tmp/peskids-seed-pools.json -w '%{http_code}' \
  -X POST "${SUPABASE_URL}/rest/v1/pools" \
  "${REST_HEADERS[@]}" \
  -H "Prefer: resolution=ignore-duplicates,return=minimal" \
  -d "$PAYLOAD")

if [[ "$HTTP_CODE" -ge 400 ]]; then
  echo "Pool seed failed (HTTP ${HTTP_CODE}):" >&2
  cat /tmp/peskids-seed-pools.json >&2 || true
  exit 1
fi

FINAL_COUNT="$(count_pools)"
echo "Peskids pools seeded for ${TENANT_SLUG} (${FINAL_COUNT} total)"
