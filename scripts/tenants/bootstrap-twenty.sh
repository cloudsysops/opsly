#!/usr/bin/env bash
# End-to-end Twenty bootstrap orchestrator (secrets → flags → compose hint → verify).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DRY_RUN=false
EXECUTE_SECRETS=false
SKIP_COMPOSE=false
TENANT="peskids"

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/bootstrap-twenty.sh [--dry-run] [--execute-secrets] [--skip-compose] [--tenant peskids]

Phases:
  1. generate-twenty-secrets.sh (--execute if --execute-secrets)
  2. doppler-configure-twenty-prd.sh (GHL off, Twenty flags when keys exist)
  3. setup-twenty-peskids.sh (VPS compose; skipped with --skip-compose on Mac)
  4. verify-twenty-stack.sh

Manual after script (cannot automate safely):
  - Open TWENTY_SERVER_URL → create first admin workspace (single-workspace mode)
  - Settings → API & Webhooks → create API key
  - echo "$KEY" | ./scripts/tenants/twenty-apply-api-key.sh
  - Redeploy peskids + api; smoke: ./scripts/tenants/twenty-crm-smoke.sh --tenant peskids
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --execute-secrets) EXECUTE_SECRETS=true ;;
    --skip-compose) SKIP_COMPOSE=true ;;
    --tenant)
      shift
      TENANT="${1:-peskids}"
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "DRY RUN: $*"
  else
    "$@"
  fi
}

echo "=== Twenty bootstrap (tenant=${TENANT}) ==="
echo ""

echo "[1/4] Generate stack secrets"
gen_args=(--tenant "$TENANT")
if [[ "$EXECUTE_SECRETS" == true ]]; then
  gen_args+=(--execute)
fi
if [[ "$DRY_RUN" == true ]]; then
  gen_args+=(--dry-run)
fi
run "${ROOT}/scripts/tenants/generate-twenty-secrets.sh" "${gen_args[@]}"
echo ""

echo "[2/4] Doppler CRM flags"
flag_args=(--tenant "$TENANT")
if [[ "$DRY_RUN" == true ]]; then
  flag_args+=(--dry-run)
fi
run "${ROOT}/scripts/tenants/doppler-configure-twenty-prd.sh" "${flag_args[@]}"
echo ""

if [[ "$TENANT" != "peskids" ]]; then
  echo "[3/4] SKIP compose (ICSO: shared stack or feat/icso-twenty-crm merge first)"
  echo "[4/4] verify when stack exists"
  exit 0
fi

echo "[3/4] Docker compose (VPS)"
if [[ "$SKIP_COMPOSE" == true ]]; then
  echo "  skipped (--skip-compose). On VPS: ./scripts/tenants/setup-twenty-peskids.sh"
else
  if [[ -f /opt/opsly/.env ]] || [[ -n "${OPSLY_ENV_FILE:-}" ]]; then
    run "${ROOT}/scripts/tenants/setup-twenty-peskids.sh"
  else
    echo "  skip local compose (no /opt/opsly/.env). On VPS after vps-bootstrap:"
    echo "    ./scripts/tenants/setup-twenty-peskids.sh"
  fi
fi
echo ""

echo "[4/4] Verify stack"
verify_args=()
if [[ "$DRY_RUN" == true ]]; then
  verify_args+=(--dry-run)
fi
run "${ROOT}/scripts/tenants/verify-twenty-stack.sh" "${verify_args[@]}" || true
echo ""

cat <<'EOF'
=== Manual (one-time) ===
1. Browse TWENTY_SERVER_URL → sign up first admin user
2. Twenty → Settings → API & Webhooks → Create API key
3. echo "<key>" | ./scripts/tenants/twenty-apply-api-key.sh --tenant peskids
4. VPS: ./scripts/vps-bootstrap.sh && redeploy peskids
5. TWENTY_SMOKE_EXPECT_IDS=true ./scripts/tenants/twenty-crm-smoke.sh --tenant peskids
EOF
