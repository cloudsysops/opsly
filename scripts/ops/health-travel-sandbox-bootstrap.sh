#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LAUNCH="${ROOT}/clients/medical-tourism-demo.launch.json"
TENANT_CONFIG="${ROOT}/config/tenants/medical-tourism-demo.json"
MODE="dry-run"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/ops/health-travel-sandbox-bootstrap.sh
  HEALTH_TRAVEL_ALLOW_SANDBOX_ONBOARD=true PLATFORM_ADMIN_TOKEN=... \
    ./scripts/ops/health-travel-sandbox-bootstrap.sh --execute-onboard

Safety:
- only medical-tourism-demo
- synthetic data only
- no production tenant slug
- no Doppler/Twenty/wacrm/deploy execution
EOF
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) MODE="dry-run" ;;
    --execute-onboard) MODE="execute-onboard" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage; exit 2 ;;
  esac
done

[[ -f "$LAUNCH" ]] || { echo "Missing launch contract: $LAUNCH" >&2; exit 1; }
[[ -f "$TENANT_CONFIG" ]] || { echo "Missing tenant fixture: $TENANT_CONFIG" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq required" >&2; exit 1; }

launch_slug="$(jq -r '.tenant_slug' "$LAUNCH")"
config_slug="$(jq -r '.tenant_slug' "$TENANT_CONFIG")"

if [[ "$launch_slug" != "medical-tourism-demo" || "$config_slug" != "medical-tourism-demo" ]]; then
  echo "Refusing: Health Travel sandbox wrapper only permits medical-tourism-demo" >&2
  exit 1
fi

if [[ "$(jq -r '.crm_provider' "$LAUNCH")" != "supabase-only" ]]; then
  echo "Refusing: sandbox launch must remain crm_provider=supabase-only" >&2
  exit 1
fi

if [[ "$(jq -r '.wacrm.enabled // false' "$LAUNCH")" != "false" ]]; then
  echo "Refusing: sandbox wacrm must remain disabled" >&2
  exit 1
fi

if [[ "$MODE" == "dry-run" ]]; then
  exec "$ROOT/scripts/provisioning/bootstrap-tenant.sh"     --launch "$LAUNCH"     --dry-run
fi

if [[ "${HEALTH_TRAVEL_ALLOW_SANDBOX_ONBOARD:-}" != "true" ]]; then
  echo "Refusing execute-onboard without HEALTH_TRAVEL_ALLOW_SANDBOX_ONBOARD=true" >&2
  exit 1
fi

if [[ -z "${PLATFORM_ADMIN_TOKEN:-}" && -z "${NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN:-}" ]]; then
  echo "Refusing execute-onboard without PLATFORM_ADMIN_TOKEN" >&2
  exit 1
fi

exec "$ROOT/scripts/provisioning/bootstrap-tenant.sh"   --launch "$LAUNCH"   --execute-onboard
