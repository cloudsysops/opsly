#!/usr/bin/env bash
# Align platform NEXT_PUBLIC_* URLs in Doppler prd (no secret values printed).
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/fix-doppler-public-urls-prd.sh [--dry-run]

Sets:
  NEXT_PUBLIC_API_URL=https://api.<PLATFORM_DOMAIN>
  NEXT_PUBLIC_APP_URL=https://api.<PLATFORM_DOMAIN>  (legacy alias; portal uses its own URL in CI)

Deletes:
  NEXT_PUBLIC_OPSLY_EVENT_BUS_URL (server-only OPSLY_EVENT_BUS_URL in compose/Doppler)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; exit 1 ;;
  esac
  shift
done

PLATFORM_DOMAIN="$(doppler secrets get PLATFORM_DOMAIN --project "$PROJECT" --config "$CONFIG" --plain 2>/dev/null || echo op-sly.com)"
API_URL="https://api.${PLATFORM_DOMAIN}"

echo "Plan (${PROJECT}/${CONFIG}):"
echo "  set  NEXT_PUBLIC_API_URL"
echo "  set  NEXT_PUBLIC_APP_URL"
echo "  delete NEXT_PUBLIC_OPSLY_EVENT_BUS_URL"

if [[ "$DRY_RUN" == true ]]; then
  exit 0
fi

doppler secrets set \
  "NEXT_PUBLIC_API_URL=${API_URL}" \
  "NEXT_PUBLIC_APP_URL=${API_URL}" \
  --project "$PROJECT" --config "$CONFIG" >/dev/null

if doppler secrets get NEXT_PUBLIC_OPSLY_EVENT_BUS_URL --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1; then
  doppler secrets delete NEXT_PUBLIC_OPSLY_EVENT_BUS_URL --project "$PROJECT" --config "$CONFIG" --yes >/dev/null
  echo "  deleted NEXT_PUBLIC_OPSLY_EVENT_BUS_URL"
fi

echo "Done. Run: ./scripts/validate-production-urls.sh && redeploy peskids"
