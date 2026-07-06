#!/usr/bin/env bash
# End-to-end wacrm production activation for Peskids (VPS + Doppler).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SLUG="peskids"
DRY_RUN=false
SKIP_PESKIDS_DEPLOY=false

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/activate-peskids-wacrm-prod.sh [--dry-run] [--skip-peskids-deploy]

1. PESKIDS_DIGEST_CRON_SECRET (generate if missing)
2. wa-peskids health proxy
3. n8n env (WACRM secret + PESKIDS_APP_URL)
4. Import + publish n8n workflows (incl. wacrm inbound)
5. Doppler: PESKIDS_INBOX_PROVIDER=wacrm, WACRM_PESKIDS_ENABLED=true
6. Redeploy Peskids container
7. Smoke tests

Run on VPS: ssh vps-dragon@100.120.151.91 'cd /opt/opsly && ./scripts/tenants/activate-peskids-wacrm-prod.sh'
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --skip-peskids-deploy) SKIP_PESKIDS_DEPLOY=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; exit 1 ;;
  esac
  shift
done

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

echo "=== activate wacrm prod (slug=${SLUG}) ==="

run chmod +x "${ROOT}/scripts/tenants/deploy-wacrm-health-proxy.sh"
run chmod +x "${ROOT}/scripts/tenants/reconcile-peskids-n8n-wacrm-env.sh"

echo "[1/7] Health proxy wa-${SLUG}"
run "${ROOT}/scripts/tenants/deploy-wacrm-health-proxy.sh" --slug "$SLUG" ${DRY_RUN:+--dry-run}

echo "[2/7] n8n env (wacrm + digest)"
run "${ROOT}/scripts/tenants/reconcile-peskids-n8n-wacrm-env.sh" ${DRY_RUN:+--dry-run}

echo "[3/7] n8n workflows import + publish"
if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] install-peskids-n8n-workflows.sh --force"
else
  "${ROOT}/scripts/install-peskids-n8n-workflows.sh" --force
fi

echo "[4/7] Doppler flags"
if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] doppler set PESKIDS_INBOX_PROVIDER=wacrm WACRM_PESKIDS_ENABLED=true URLs"
else
  if doppler secrets set \
    PESKIDS_INBOX_PROVIDER=wacrm \
    WACRM_PESKIDS_ENABLED=true \
    WACRM_PESKIDS_SERVER_URL="https://wa-${SLUG}.op-sly.com" \
    NEXT_PUBLIC_WACRM_PESKIDS_SERVER_URL="https://wa-${SLUG}.op-sly.com" \
    --project ops-intcloudsysops --config prd >/dev/null 2>&1; then
    echo "  set  PESKIDS_INBOX_PROVIDER=wacrm WACRM_PESKIDS_ENABLED=true"
  else
    echo "  WARN: Doppler write failed on this host — set flags from Mac with doppler CLI"
  fi
fi

echo "[5/7] Redeploy Peskids"
if [[ "$SKIP_PESKIDS_DEPLOY" != true ]]; then
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] peskids-deploy-vps.sh"
  else
    PESKIDS_DEPLOY_IN_PLACE=1 "${ROOT}/scripts/peskids-deploy-vps.sh"
  fi
fi

echo "[6/7] wacrm smoke"
if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] wacrm-smoke.sh"
else
  doppler run --project ops-intcloudsysops --config prd -- \
    "${ROOT}/scripts/tenants/wacrm-smoke.sh" --slug "$SLUG"
fi

echo "[7/7] Integration smoke"
if [[ "$DRY_RUN" != true ]]; then
  doppler run --project ops-intcloudsysops --config prd -- bash -c '
    set -euo pipefail
    EXT="activate-$(date +%s)"
    code=$(curl -sS -o /tmp/wacrm-smoke.json -w "%{http_code}" -X POST "https://n8n-peskids.op-sly.com/webhook/wacrm-peskids-inbound" \
      -H "Content-Type: application/json" \
      -d "{\"event_type\":\"inbound_message\",\"external_message_id\":\"${EXT}\",\"phone\":\"+573001112233\",\"contact_name\":\"Activate\",\"body\":\"wacrm n8n path\",\"direction\":\"inbound\"}")
    echo "n8n_webhook_http=${code}"
    test "$code" = "200" || test "$code" = "201"
    digest_code=$(curl -sS -o /dev/null -w "%{http_code}" "https://peskids.op-sly.com/api/admin/digest/daily" \
      -H "Authorization: Bearer ${PESKIDS_DIGEST_CRON_SECRET}")
    echo "digest_http=${digest_code}"
    test "$digest_code" = "200"
    curl -sfS "https://peskids.op-sly.com/" >/dev/null
    curl -sfS "https://peskids.op-sly.com/admin/login" >/dev/null
    echo "OK integration smoke"
  '
fi

echo ""
echo "=== wacrm prod activation complete ==="
