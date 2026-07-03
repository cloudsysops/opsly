#!/usr/bin/env bash
# Verify Twenty CRM stack: Doppler secrets (names only) + HTTP health + optional REST probe.
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
DRY_RUN=false
PROBE_API=false

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/verify-twenty-stack.sh [--dry-run] [--probe-api]

Checks:
  1. Doppler has TWENTY_SERVER_URL, TWENTY_APP_SECRET, TWENTY_ENCRYPTION_KEY, TWENTY_PG_PASSWORD
  2. GET ${TWENTY_SERVER_URL}/healthz returns 2xx
  3. With --probe-api: GET /rest/people (limit 1) using TWENTY_API_KEY from Doppler

Run on VPS after: ./scripts/tenants/setup-twenty-peskids.sh
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --probe-api) PROBE_API=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if ! command -v doppler >/dev/null 2>&1; then
  echo "FAIL: doppler CLI not found" >&2
  exit 1
fi

missing=()
for name in TWENTY_SERVER_URL TWENTY_APP_SECRET TWENTY_ENCRYPTION_KEY TWENTY_PG_PASSWORD; do
  if ! doppler secrets get "$name" --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1; then
    missing+=("$name")
  else
    echo "ok   Doppler secret present: $name"
  fi
done

if ((${#missing[@]} > 0)); then
  echo "FAIL: missing Doppler secrets: ${missing[*]}" >&2
  echo "Run: ./scripts/tenants/generate-twenty-secrets.sh --execute" >&2
  exit 1
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "DRY RUN: would curl healthz and optional API probe"
  exit 0
fi

server_url="$(doppler secrets get TWENTY_SERVER_URL --project "$PROJECT" --config "$CONFIG" --plain)"
server_url="${server_url%/}"
health_url="${server_url}/healthz"

code="$(curl -sfk -o /dev/null -w '%{http_code}' --max-time 15 "$health_url" || echo "000")"
echo "GET ${health_url} → HTTP ${code}"

if [[ "$code" != "200" && "$code" != "204" ]]; then
  echo "FAIL: Twenty health check failed (is compose up? DNS? Traefik?)" >&2
  exit 1
fi

if [[ "$PROBE_API" == true ]]; then
  if ! doppler secrets get TWENTY_API_KEY --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1; then
    echo "WARN: TWENTY_API_KEY missing — skip API probe (create key in Twenty UI)" >&2
    exit 0
  fi
  doppler run --project "$PROJECT" --config "$CONFIG" -- bash -c '
    set -euo pipefail
    base="${TWENTY_API_URL:-${TWENTY_SERVER_URL}}"
    base="${base%/}"
    code=$(curl -sfk -o /dev/null -w "%{http_code}" --max-time 20 \
      -H "Authorization: Bearer ${TWENTY_API_KEY}" \
      -H "Accept: application/json" \
      "${base}/rest/people?limit=1" || echo "000")
    echo "GET ${base}/rest/people?limit=1 → HTTP ${code}"
    if [[ "$code" != "200" ]]; then
      exit 1
    fi
  '
fi

echo "PASS: Twenty stack verification OK"
