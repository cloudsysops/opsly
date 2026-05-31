#!/usr/bin/env bash
set -euo pipefail

# Seed default Peskids pools for operations MVP (idempotent).
# Usage: doppler run --project ops-intcloudsysops --config prd -- ./scripts/seed-peskids-pools.sh [--dry-run]

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

TENANT_SLUG="${NEXT_PUBLIC_TENANT_ID:-peskids}"
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
MIN_POOLS="${PESKIDS_MIN_POOLS:-3}"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  echo "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" >&2
  exit 1
fi

REST_BASE="${SUPABASE_URL%/}/rest/v1"
AUTH_HEADERS=(
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}"
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
)

POOL_ROWS='[
  {"tenant_slug":"'"${TENANT_SLUG}"'","name":"Piscina Llanogrande A","location":"llanogrande","max_capacity":12,"active":true},
  {"tenant_slug":"'"${TENANT_SLUG}"'","name":"Piscina Llanogrande B","location":"llanogrande","max_capacity":10,"active":true},
  {"tenant_slug":"'"${TENANT_SLUG}"'","name":"Clase domicilio","location":"domicilio","max_capacity":4,"active":true}
]'

if $DRY_RUN; then
  echo "[dry-run] Would ensure >= ${MIN_POOLS} pools for tenant ${TENANT_SLUG}:"
  echo "$POOL_ROWS" | jq .
  exit 0
fi

EXISTING=$(curl -sS "${REST_BASE}/pools?tenant_slug=eq.${TENANT_SLUG}&select=id" \
  "${AUTH_HEADERS[@]}" \
  -H "Accept-Profile: peskids" | jq 'length')

if [[ "${EXISTING:-0}" -ge "$MIN_POOLS" ]]; then
  echo "Peskids pools already present for ${TENANT_SLUG} (${EXISTING} rows)"
  exit 0
fi

HTTP_CODE=$(curl -sS -o /tmp/peskids-seed-pools.json -w '%{http_code}' \
  -X POST "${REST_BASE}/pools" \
  "${AUTH_HEADERS[@]}" \
  -H "Content-Profile: peskids" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "$POOL_ROWS")

if [[ "$HTTP_CODE" -ge 400 ]]; then
  echo "Pool seed failed (HTTP ${HTTP_CODE}):" >&2
  cat /tmp/peskids-seed-pools.json >&2 || true
  exit 1
fi

FINAL=$(curl -sS "${REST_BASE}/pools?tenant_slug=eq.${TENANT_SLUG}&select=id" \
  "${AUTH_HEADERS[@]}" \
  -H "Accept-Profile: peskids" | jq 'length')

echo "Peskids pools seeded for ${TENANT_SLUG} (${FINAL} total)"
