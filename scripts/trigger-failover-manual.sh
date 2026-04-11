#!/usr/bin/env bash
# Ejecutar failover de pesos en un pool de Cloudflare Load Balancing (requiere segundo origen y permisos de API).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$REPO_ROOT/config/failover-monitor.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$REPO_ROOT/config/failover-monitor.env" && set +a
fi

CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"
: "${CLOUDFLARE_ACCOUNT_ID:?Definir CLOUDFLARE_ACCOUNT_ID}"
: "${CLOUDFLARE_POOL_ID:?Definir CLOUDFLARE_POOL_ID}"
: "${CLOUDFLARE_API_TOKEN:?Definir CLOUDFLARE_API_TOKEN}"
: "${PRIMARY_ORIGIN_ADDRESS:?Definir PRIMARY_ORIGIN_ADDRESS}"
: "${FAILOVER_ORIGIN_ADDRESS:?Definir FAILOVER_ORIGIN_ADDRESS}"

PRIMARY_ORIGIN_NAME="${PRIMARY_ORIGIN_NAME:-primary}"
FAILOVER_ORIGIN_NAME="${FAILOVER_ORIGIN_NAME:-failover}"

if ! command -v jq >/dev/null 2>&1; then
  echo "Instalar jq." >&2
  exit 1
fi

payload="$(jq -n \
  --arg n1 "$PRIMARY_ORIGIN_NAME" --arg a1 "$PRIMARY_ORIGIN_ADDRESS" \
  --arg n2 "$FAILOVER_ORIGIN_NAME" --arg a2 "$FAILOVER_ORIGIN_ADDRESS" \
  '{origins: [
    {name: $n1, address: $a1, enabled: true, weight: 0},
    {name: $n2, address: $a2, enabled: true, weight: 1}
  ]}')"

curl -sS -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/load_balancers/pools/${CLOUDFLARE_POOL_ID}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload" | jq .
