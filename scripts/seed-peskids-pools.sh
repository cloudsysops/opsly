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

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  echo "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" >&2
  exit 1
fi

SQL=$(cat <<EOF
INSERT INTO peskids.pools (tenant_slug, name, location, max_capacity, active)
VALUES
  ('${TENANT_SLUG}', 'Piscina Llanogrande A', 'llanogrande', 12, true),
  ('${TENANT_SLUG}', 'Piscina Llanogrande B', 'llanogrande', 10, true),
  ('${TENANT_SLUG}', 'Clase domicilio', 'domicilio', 4, true)
ON CONFLICT DO NOTHING;
EOF
)

if $DRY_RUN; then
  echo "[dry-run] Would seed pools for tenant ${TENANT_SLUG}:"
  echo "$SQL"
  exit 0
fi

PAYLOAD=$(jq -n --arg sql "$SQL" '{query: $sql}')

HTTP_CODE=$(curl -sS -o /tmp/peskids-seed-pools.json -w '%{http_code}' \
  -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" == "404" || "$HTTP_CODE" == "000" ]]; then
  echo "Note: exec_sql RPC unavailable (${HTTP_CODE}). Apply migration 009 first, then insert pools via Supabase SQL editor:"
  echo "$SQL"
  exit 0
fi

if [[ "$HTTP_CODE" -ge 400 ]]; then
  echo "Pool seed failed (HTTP ${HTTP_CODE}):" >&2
  cat /tmp/peskids-seed-pools.json >&2 || true
  exit 1
fi

echo "Peskids pools seeded for ${TENANT_SLUG}"
