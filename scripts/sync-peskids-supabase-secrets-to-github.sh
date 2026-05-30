#!/usr/bin/env bash
# Copy Peskids Supabase NEXT_PUBLIC_* from Doppler prd → GitHub Actions secrets.
# Never prints secret values. Requires: doppler login, gh auth login.
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
REPO="${GITHUB_REPOSITORY:-cloudsysops/opsly}"
DRY_RUN=false

KEYS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
)

usage() {
  cat <<EOF
Usage: ./scripts/sync-peskids-supabase-secrets-to-github.sh [--dry-run]

Syncs Doppler ($PROJECT / $CONFIG) → GitHub repository secrets for:
  ${KEYS[*]}

Required for Peskids Docker build-args (client auth). Runtime login also reads Doppler via VPS --env-file.

Prerequisites:
  doppler login
  gh auth login
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

for key in "${KEYS[@]}"; do
  value="$(doppler secrets get "$key" --plain --project "$PROJECT" --config "$CONFIG" 2>/dev/null || true)"
  if [[ -z "$value" ]]; then
    echo "Missing in Doppler ($PROJECT/$CONFIG): $key" >&2
    exit 1
  fi
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] would set GitHub secret $key for $REPO"
  else
    printf '%s' "$value" | gh secret set "$key" --repo "$REPO"
    echo "ok   GitHub secret $key"
  fi
done

echo "Done. Re-run Deploy Peskids workflow after merge or workflow_dispatch."
