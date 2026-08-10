#!/usr/bin/env bash
# Unified CRM smoke for Peskids and ICSO (Twenty path).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TENANT="peskids"
DRY_RUN=false
BASE_URL=""

usage() {
  cat <<'EOF'
Usage: ./scripts/tenants/twenty-crm-smoke.sh --tenant peskids|icso [--dry-run] [--base-url URL]

  peskids → scripts/peskids/twenty-crm-smoke.sh (Twenty path; TWENTY_SMOKE_EXPECT_IDS=true in prod)
  icso    → scripts/icso/lead-capture-smoke.sh (Twenty / Supabase lead intake)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant)
      shift
      TENANT="${1:-peskids}"
      ;;
    --dry-run) DRY_RUN=true ;;
    --base-url)
      shift
      BASE_URL="${1:-}"
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

case "$TENANT" in
  peskids)
    args=()
    [[ "$DRY_RUN" == true ]] && args+=(--dry-run)
    [[ -n "$BASE_URL" ]] && args+=(--base-url "$BASE_URL")
    exec "${ROOT}/scripts/peskids/twenty-crm-smoke.sh" "${args[@]}"
    ;;
  icso)
    args=()
    [[ "$DRY_RUN" == true ]] && args+=(--dry-run)
    [[ -n "$BASE_URL" ]] && args+=(--base-url "$BASE_URL")
    exec "${ROOT}/scripts/icso/lead-capture-smoke.sh" "${args[@]}"
    ;;
  *)
    echo "Invalid --tenant: $TENANT" >&2
    exit 1
    ;;
esac
