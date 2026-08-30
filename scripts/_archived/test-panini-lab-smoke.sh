#!/usr/bin/env bash
# Smoke tests for Panini Lab production (HTTPS + webhook).
# Secrets from Doppler only — never print secret values.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
PANINI_BASE="${PANINI_BASE:-https://panini.op-sly.com}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/test-panini-lab-smoke.sh [--dry-run]

Env:
  PANINI_BASE   App URL (default https://panini.op-sly.com)

Requires: doppler CLI + access to ops-intcloudsysops/prd
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

if ! command -v doppler >/dev/null 2>&1; then
  echo "doppler CLI required" >&2
  exit 1
fi

for name in PANINI_INBOUND_WEBHOOK_SECRET SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY; do
  if doppler secrets get "$name" --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1; then
    echo "ok   Doppler has $name"
  else
    echo "warn Doppler missing $name"
  fi
done

echo ""
echo "== Public HTTPS =="
if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] GET $PANINI_BASE/dashboard"
  echo "[dry-run] GET $PANINI_BASE/"
else
  code=$(curl -sk -o /dev/null -w '%{http_code}' "$PANINI_BASE/dashboard" || true)
  echo "GET $PANINI_BASE/dashboard → HTTP $code"
  if [[ "$code" != "200" && "$code" != "307" ]]; then
    echo "fail dashboard not reachable" >&2
    exit 1
  fi
  code=$(curl -sk -o /dev/null -w '%{http_code}' "$PANINI_BASE/" || true)
  echo "GET $PANINI_BASE/ → HTTP $code"
fi

echo ""
echo "== Inbound webhook (collection update) =="
if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] POST $PANINI_BASE/api/webhooks/inbound"
else
  doppler run --project "$PROJECT" --config "$CONFIG" -- bash -c '
    set -euo pipefail
    SECRET="${PANINI_INBOUND_WEBHOOK_SECRET:?set PANINI_INBOUND_WEBHOOK_SECRET in Doppler prd}"
    BODY="{\"text\":\"Tengo la 10 de Colombia (smoke)\",\"sender\":\"smoke-$(date +%s)\",\"channel\":\"web\"}"
    resp=$(curl -sk -w "\nHTTP_CODE:%{http_code}" -X POST "'"$PANINI_BASE"'/api/webhooks/inbound" \
      -H "Content-Type: application/json" \
      -H "x-panini-webhook-secret: $SECRET" \
      -d "$BODY")
    code="${resp##*HTTP_CODE:}"
    body="${resp%HTTP_CODE:*}"
    echo "POST webhook → HTTP $code"
    echo "$body" | head -c 500
    echo ""
    if [[ "$code" != "200" ]]; then
      exit 1
    fi
    echo "ok   webhook accepted (HTTP 200)"
  '
fi

echo ""
echo "Panini Lab smoke complete."
