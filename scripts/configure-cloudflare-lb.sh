#!/usr/bin/env bash
# Actualiza orígenes de un pool de Cloudflare Load Balancing (misma API que trigger-failover-manual).
# Requiere variables de entorno; ver config/failover-monitor.env.example
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=false
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

if [[ -f "$REPO_ROOT/config/gcp.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$REPO_ROOT/config/gcp.env" && set +a
elif [[ -f "$REPO_ROOT/config/gcp-opslyquantum.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$REPO_ROOT/config/gcp-opslyquantum.env" && set +a
fi

GCP_PROJECT_ID="${GCP_PROJECT_ID:-opslyquantum}"

if [[ -f "$REPO_ROOT/config/failover-monitor.env" ]]; then
  # shellcheck source=/dev/null
  set -a && source "$REPO_ROOT/config/failover-monitor.env" && set +a
fi

CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-${CF_ACCOUNT_ID:-}}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"

: "${CLOUDFLARE_ACCOUNT_ID:?Definir CLOUDFLARE_ACCOUNT_ID (o CF_ACCOUNT_ID en config/gcp.env)}"
: "${CLOUDFLARE_POOL_ID:?Definir CLOUDFLARE_POOL_ID}"
: "${CLOUDFLARE_API_TOKEN:?Definir CLOUDFLARE_API_TOKEN}"
: "${PRIMARY_ORIGIN_ADDRESS:?Definir PRIMARY_ORIGIN_ADDRESS}"
: "${FAILOVER_ORIGIN_ADDRESS:?Definir FAILOVER_ORIGIN_ADDRESS}"

PRIMARY_ORIGIN_NAME="${PRIMARY_ORIGIN_NAME:-primary-do}"
FAILOVER_ORIGIN_NAME="${FAILOVER_ORIGIN_NAME:-failover-gcp}"
PRIMARY_WEIGHT="${PRIMARY_WEIGHT:-1}"
FAILOVER_WEIGHT="${FAILOVER_WEIGHT:-0}"

command -v jq >/dev/null 2>&1 || {
  echo "Instalar jq." >&2
  exit 1
}

payload="$(jq -n \
  --arg n1 "$PRIMARY_ORIGIN_NAME" --arg a1 "$PRIMARY_ORIGIN_ADDRESS" --argjson w1 "$PRIMARY_WEIGHT" \
  --arg n2 "$FAILOVER_ORIGIN_NAME" --arg a2 "$FAILOVER_ORIGIN_ADDRESS" --argjson w2 "$FAILOVER_WEIGHT" \
  '{origins: [
    {name: $n1, address: $a1, enabled: true, weight: $w1},
    {name: $n2, address: $a2, enabled: true, weight: $w2}
  ]}')"

URL="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/load_balancers/pools/${CLOUDFLARE_POOL_ID}"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] GCP_PROJECT_ID=$GCP_PROJECT_ID (referencia)"
  echo "[dry-run] curl -X PUT $URL"
  echo "$payload" | jq .
  exit 0
fi

curl -sS -X PUT "$URL" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$payload" | jq .
