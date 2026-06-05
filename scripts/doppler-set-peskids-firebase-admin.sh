#!/usr/bin/env bash
# Upload Firebase service account JSON to Doppler (never prints JSON or keys).
set -euo pipefail

PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
CONFIG="${DOPPLER_CONFIG:-prd}"
DRY_RUN=false
JSON_FILE=""
FORCE=false

usage() {
  cat <<EOF
Usage: ./scripts/doppler-set-peskids-firebase-admin.sh --file PATH [--dry-run] [--force]

Stores PESKIDS_FIREBASE_ADMIN_JSON in Doppler (${PROJECT}/${CONFIG}).
The file is piped via stdin — contents are never printed.

PATH must be a service account JSON (see config/peskids-firebase-admin.json.example).
Do not commit the real file; prefer apps/peskids/.secrets/ (gitignored).

Prerequisites: doppler login with write access to ${PROJECT}/${CONFIG}
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      shift
      JSON_FILE="${1:?--file requires a path}"
      ;;
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; exit 1 ;;
  esac
  shift
done

[[ -n "$JSON_FILE" ]] || { usage; exit 1; }
[[ -f "$JSON_FILE" ]] || { echo "File not found: $JSON_FILE" >&2; exit 1; }

command -v doppler >/dev/null 2>&1 || { echo "Missing: doppler" >&2; exit 2; }
command -v jq >/dev/null 2>&1 || { echo "Missing: jq" >&2; exit 2; }

# Validate shape without dumping secrets
jq -e '.type == "service_account" and (.private_key | type) == "string" and (.client_email | type) == "string"' \
  "$JSON_FILE" >/dev/null || {
  echo "Invalid Firebase admin JSON (expected service_account with private_key, client_email)" >&2
  exit 1
}

if doppler secrets get PESKIDS_FIREBASE_ADMIN_JSON --project "$PROJECT" --config "$CONFIG" --plain >/dev/null 2>&1 \
  && [[ "$FORCE" != true ]]; then
  echo "ok   PESKIDS_FIREBASE_ADMIN_JSON already set in ${PROJECT}/${CONFIG} (use --force to replace)"
  exit 0
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "plan set PESKIDS_FIREBASE_ADMIN_JSON from $(basename "$JSON_FILE") → Doppler ${PROJECT}/${CONFIG}"
  exit 0
fi

jq -c . "$JSON_FILE" | doppler secrets set PESKIDS_FIREBASE_ADMIN_JSON \
  --project "$PROJECT" --config "$CONFIG" >/dev/null

echo "ok   PESKIDS_FIREBASE_ADMIN_JSON → Doppler ${PROJECT}/${CONFIG}"
echo "Next: rotate old key in Firebase Console if this replaces an exposed file on disk."
