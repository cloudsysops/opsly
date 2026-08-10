#!/usr/bin/env bash
# Tenant bootstrap orchestrator — launch contract → registry → CRM flags → Twenty → readiness.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LAUNCH=""
DRY_RUN=true
EXECUTE_ONBOARD=false
EXECUTE_DOPPLER=false
EXECUTE_TWENTY=false
EXECUTE_WACRM=false
PLAN="startup"

usage() {
  cat <<'EOF'
Usage: ./scripts/provisioning/bootstrap-tenant.sh --launch clients/<slug>.launch.json [options]

Options:
  --dry-run              Print plan only (default)
  --execute              Enable all safe automation phases below
  --execute-onboard      POST /api/tenants via scripts/tenant/onboard.sh (needs PLATFORM_ADMIN_TOKEN)
  --execute-doppler      Run doppler-configure-twenty-prd.sh for tenant
  --execute-twenty       Run bootstrap-twenty.sh (Peskids compose on VPS only)
  --execute-wacrm        Run bootstrap-wacrm.sh when launch wacrm.enabled=true
  --plan startup|business|enterprise   For onboard API

Phases (always printed):
  1. Validate launch JSON exists + tenant_slug
  2. client:plan (markdown plan)
  3. Registry check (config/tenants/<slug>.json)
  4. Optional onboard API
  5. Optional Doppler Twenty flags
  6. Optional Twenty stack bootstrap
  7. onboarding-readiness.sh (curl health URLs)

Manual (documented once per tenant):
  - Twenty UI: first admin + API key → twenty-apply-api-key.sh
  - DNS / Traefik if new subdomain
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --launch)
      shift
      LAUNCH="${1:-}"
      ;;
    --dry-run) DRY_RUN=true ;;
    --execute)
      DRY_RUN=false
      EXECUTE_ONBOARD=true
      EXECUTE_DOPPLER=true
      ;;
    --execute-onboard) EXECUTE_ONBOARD=true; DRY_RUN=false ;;
    --execute-doppler) EXECUTE_DOPPLER=true; DRY_RUN=false ;;
    --execute-twenty) EXECUTE_TWENTY=true; DRY_RUN=false ;;
    --execute-wacrm) EXECUTE_WACRM=true; DRY_RUN=false ;;
    --plan)
      shift
      PLAN="${1:-startup}"
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

if [[ -z "$LAUNCH" ]]; then
  echo "Missing --launch clients/<slug>.launch.json" >&2
  usage
  exit 1
fi

if [[ ! -f "$LAUNCH" ]]; then
  echo "Launch file not found: $LAUNCH" >&2
  exit 1
fi

command -v jq >/dev/null 2>&1 || {
  echo "jq required" >&2
  exit 1
}

SLUG="$(jq -r '.tenant_slug' "$LAUNCH")"
EMAIL="$(jq -r '.primary_email' "$LAUNCH")"
CRM="$(jq -r '.crm_provider // "twenty"' "$LAUNCH")"
VERTICAL="$(jq -r '.vertical_blueprint_id // "unknown"' "$LAUNCH")"
WACRM_ENABLED="$(jq -r '.wacrm.enabled // false' "$LAUNCH")"

if [[ -z "$SLUG" || "$SLUG" == "null" ]]; then
  echo "Invalid tenant_slug in $LAUNCH" >&2
  exit 1
fi

map_tenant_flag() {
  case "$SLUG" in
    peskids) echo "peskids" ;;
    intcloudsysops) echo "icso" ;;
    *) echo "none" ;;
  esac
}
TENANT_FLAG="$(map_tenant_flag)"

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "DRY RUN: $*"
  else
    "$@"
  fi
}

echo "=== Tenant bootstrap: ${SLUG} ==="
echo "launch: $LAUNCH"
echo "crm_provider: $CRM | vertical: $VERTICAL"
echo "dry_run: $DRY_RUN"
echo ""

echo "[1/8] Launch contract"
jq '{tenant_slug, business_name, industry, domain, crm_provider, vertical_blueprint_id}' "$LAUNCH"
echo ""

echo "[2/8] Launch plan"
if [[ "$DRY_RUN" == true ]]; then
  echo "DRY RUN: npm run client:plan -- --tenant-slug $SLUG"
else
  npm run client:plan -- --tenant-slug "$SLUG" 2>/dev/null | head -40 || true
fi
echo ""

echo "[3/8] Registry"
REG="${ROOT}/config/tenants/${SLUG}.json"
if [[ -f "$REG" ]]; then
  echo "  ok   $REG exists"
else
  echo "  miss $REG — run: npm run client:setup or copy config/tenants/_template.tenant.json"
fi
echo ""

echo "[4/8] Platform onboard (API)"
if [[ "$EXECUTE_ONBOARD" == true ]]; then
  if [[ -z "${PLATFORM_ADMIN_TOKEN:-}" && -z "${NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN:-}" ]]; then
    echo "  skip onboard (set PLATFORM_ADMIN_TOKEN)"
  else
    run "${ROOT}/scripts/tenant/onboard.sh" --slug "$SLUG" --email "$EMAIL" --plan "$PLAN"
  fi
else
  echo "  skip (use --execute-onboard). Example:"
  echo "    PLATFORM_ADMIN_TOKEN=... ./scripts/tenant/onboard.sh --slug $SLUG --email $EMAIL --plan $PLAN"
fi
echo ""

echo "[5/8] Doppler CRM flags"
if [[ "$CRM" == "twenty" && "$TENANT_FLAG" != "none" ]]; then
  if [[ "$EXECUTE_DOPPLER" == true ]]; then
    run "${ROOT}/scripts/tenants/doppler-configure-twenty-prd.sh" --tenant "$TENANT_FLAG"
  else
    echo "  plan ./scripts/tenants/doppler-configure-twenty-prd.sh --tenant $TENANT_FLAG"
  fi
else
  echo "  skip Twenty flags (crm=$CRM tenant_flag=$TENANT_FLAG)"
fi
echo ""

echo "[6/8] Twenty stack"
if [[ "$CRM" == "twenty" && "$SLUG" == "peskids" && "$EXECUTE_TWENTY" == true ]]; then
  run "${ROOT}/scripts/tenants/bootstrap-twenty.sh" --tenant peskids --skip-compose
else
  echo "  plan ./scripts/tenants/bootstrap-twenty.sh --tenant peskids (VPS)"
  echo "  manual: Twenty UI admin + twenty-apply-api-key.sh"
fi
echo ""

echo "[7/8] wacrm inbox (optional)"
if [[ "$WACRM_ENABLED" == "true" ]]; then
  if [[ "$EXECUTE_WACRM" == true ]]; then
    run "${ROOT}/scripts/tenants/bootstrap-wacrm.sh" --slug "$SLUG"
  else
    echo "  plan ./scripts/tenants/bootstrap-wacrm.sh --slug $SLUG"
    echo "  contract: docs/blueprints/WACRM-TWENTY-HYBRID-CONTRACT.md"
  fi
else
  echo "  skip (launch wacrm.enabled=false). Enable after Twenty stable."
  echo "  hint: ./scripts/tenants/bootstrap-wacrm.sh --slug $SLUG --dry-run"
fi
echo ""

echo "[8/8] Readiness probes"
if [[ "$DRY_RUN" == true ]]; then
  echo "DRY RUN: ./scripts/tenant/onboarding-readiness.sh --tenant-slug $SLUG"
else
  "${ROOT}/scripts/tenant/onboarding-readiness.sh" --tenant-slug "$SLUG" 2>/dev/null || echo "  readiness script failed or missing env (non-fatal)"
fi
echo ""

cat <<EOF
=== Manual one-time (per tenant) ===
1. Twenty: browse TWENTY_SERVER_URL → workspace + API key
2. echo "<key>" | ./scripts/tenants/twenty-apply-api-key.sh --tenant ${TENANT_FLAG:-peskids}
3. VPS: ./scripts/vps-bootstrap.sh && redeploy ${SLUG} app
4. TWENTY_SMOKE_EXPECT_IDS=true ./scripts/tenants/twenty-crm-smoke.sh --tenant ${TENANT_FLAG:-peskids}
5. n8n: ./scripts/install-crm-workflows.sh --slug ${SLUG} --dry-run
6. wacrm (optional): ./scripts/tenants/bootstrap-wacrm.sh --slug ${SLUG} --dry-run

Docs: docs/blueprints/TENANT-REPEAT-PLAYBOOK.md
     docs/blueprints/WACRM-TWENTY-HYBRID-CONTRACT.md
EOF
