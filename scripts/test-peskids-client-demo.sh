#!/usr/bin/env bash
# End-to-end smoke for Peskids client demo (landing + inbound WhatsApp + admin API).
# Secrets from Doppler only — never print secret values.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
PESKIDS_BASE="${PESKIDS_BASE:-https://peskids.op-sly.com}"
API_BASE="${API_BASE:-https://api.op-sly.com}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/test-peskids-client-demo.sh [--dry-run]

Env:
  PESKIDS_BASE   App URL (default https://peskids.op-sly.com)
  API_BASE       Opsly API (default https://api.op-sly.com)

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

for name in JELOU_WEBHOOK_SECRET DASHBOARD_ADMIN_SECRET PESKIDS_INBOUND_WEBHOOK_SECRET; do
  if doppler secrets get "$name" --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1; then
    echo "ok   Doppler has $name"
  fi
done

if doppler secrets get NEXT_PUBLIC_PESKIDS_WHATSAPP_E164 --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1; then
  echo "ok   Doppler has NEXT_PUBLIC_PESKIDS_WHATSAPP_E164 (wa.me + simulación from=)"
else
  echo "warn Doppler sin NEXT_PUBLIC_PESKIDS_WHATSAPP_E164 — usa ./scripts/peskids-promote-whatsapp-doppler.sh"
fi

echo ""
echo "== Public URLs =="
if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] curl $PESKIDS_BASE/"
  echo "[dry-run] curl $PESKIDS_BASE/admin/login"
else
  code=$(curl -sk -o /dev/null -w '%{http_code}' "$PESKIDS_BASE/" || true)
  echo "GET $PESKIDS_BASE/ → HTTP $code"
  code=$(curl -sk -o /dev/null -w '%{http_code}' "$PESKIDS_BASE/admin/login" || true)
  echo "GET $PESKIDS_BASE/admin/login → HTTP $code"
fi

echo ""
echo "== MVP API (public leads) =="
if [[ "$DRY_RUN" != true ]]; then
  API_BASE="$API_BASE" "$ROOT_DIR/scripts/peskids-mvp-smoke.sh"
fi

echo ""
echo "== Simulated WhatsApp inbound =="
DEMO_ID="demo-wa-$(date +%s)"
if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] POST $PESKIDS_BASE/api/webhooks/inbound"
else
  doppler run --project "$PROJECT" --config "$CONFIG" -- bash -c '
    set -euo pipefail
    SECRET="${PESKIDS_INBOUND_WEBHOOK_SECRET:-${JELOU_WEBHOOK_SECRET:?}}"
    ADMIN="${DASHBOARD_ADMIN_SECRET:?}"
    BASE="'"$PESKIDS_BASE"'"
    WA_FROM="${NEXT_PUBLIC_PESKIDS_WHATSAPP_E164:-573001112233}"
    BODY="{\"source\":\"whatsapp\",\"from\":\"${WA_FROM}\",\"name\":\"Prueba WhatsApp Doppler\",\"text\":\"Hola, quiero clase de prueba para mi hijo\",\"messageId\":\"'"$DEMO_ID"'\"}"
    code=$(curl -sk -o /tmp/pk-inbound.json -w "%{http_code}" -X POST "${BASE}/api/webhooks/inbound" \
      -H "Content-Type: application/json" \
      -H "x-webhook-secret: ${SECRET}" \
      -d "${BODY}" || true)
    echo "POST inbound → HTTP ${code}"
    if [[ "${code}" != "201" ]]; then
      head -c 400 /tmp/pk-inbound.json >&2 || true
      echo >&2
      exit 1
    fi
    head -c 200 /tmp/pk-inbound.json
    echo ""
    code=$(curl -sk -o /tmp/pk-dash.json -w "%{http_code}" \
      -H "Authorization: Bearer ${ADMIN}" \
      "${BASE}/api/dashboard" || true)
    echo "GET dashboard → HTTP ${code}"
    if [[ "${code}" != "200" ]]; then
      head -c 400 /tmp/pk-dash.json >&2 || true
      exit 1
    fi
    if ! grep -q "Padre Demo Cliente" /tmp/pk-dash.json 2>/dev/null; then
      echo "WARN: demo message not found in dashboard JSON (¿migración messages aplicada?)" >&2
    else
      echo "ok   Mensaje visible en dashboard API"
    fi
  '
fi

echo ""
echo "== n8n webhook (optional) =="
echo "  POST ${PESKIDS_BASE%/}/../n8n-peskids.op-sly.com/webhook/peskids-whatsapp"
echo "  (requires ./scripts/install-peskids-n8n-workflows.sh on VPS + Baileys QR)"
echo ""
echo "Cliente demo:"
echo "  1. Abrir $PESKIDS_BASE"
echo "  2. Formulario clase de prueba"
echo "  3. $PESKIDS_BASE/admin/login → token DASHBOARD_ADMIN_SECRET (Doppler)"
echo "  4. Ver tarjeta Mensajes entrantes (WhatsApp simulado arriba)"
echo "Done."
