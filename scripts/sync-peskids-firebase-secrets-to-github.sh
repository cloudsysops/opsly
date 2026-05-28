#!/usr/bin/env bash
# Copy Peskids Firebase NEXT_PUBLIC_* from Doppler prd → GitHub Actions secrets (build-time).
# Never prints secret values. Requires: doppler login, gh auth login.
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
REPO="${GITHUB_REPOSITORY:-cloudsysops/opsly}"
DRY_RUN=false

KEYS=(
  NEXT_PUBLIC_FIREBASE_API_KEY
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  NEXT_PUBLIC_FIREBASE_PROJECT_ID
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  NEXT_PUBLIC_FIREBASE_APP_ID
  NEXT_PUBLIC_FIREBASE_VAPID_KEY
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
)

usage() {
  cat <<EOF
Usage: ./scripts/sync-peskids-firebase-secrets-to-github.sh [--dry-run]

Syncs Doppler ($PROJECT / $CONFIG) → GitHub repository secrets for:
  ${KEYS[*]}

Prerequisites:
  doppler login
  gh auth login
  gh repo view "$REPO" >/dev/null
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

for cmd in doppler gh; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Missing: $cmd" >&2
    exit 1
  }
done

gh repo view "$REPO" >/dev/null

missing=0
for key in "${KEYS[@]}"; do
  if ! doppler secrets get "$key" --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1; then
    echo "Missing in Doppler ($CONFIG): $key" >&2
    missing=1
  fi
done
if [ "$missing" -ne 0 ]; then
  exit 1
fi

for key in "${KEYS[@]}"; do
  if [ "$DRY_RUN" = true ]; then
    echo "plan gh secret set $key --repo $REPO  (from Doppler, value hidden)"
    continue
  fi
  doppler secrets get "$key" --project "$PROJECT" --config "$CONFIG" --plain \
    | gh secret set "$key" --repo "$REPO"
  echo "ok   $key → GitHub ($REPO)"
done

echo "Done. Verify: gh secret list --repo $REPO | grep FIREBASE"
