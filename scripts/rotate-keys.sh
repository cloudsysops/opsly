#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-ops-intcloudsysops}"
CONFIG="${CONFIG:-prd}"
GCP_JSON_PATH=""
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage:
  ./scripts/rotate-keys.sh --gcp-json-path /secure/new-service-account.json [--project ops-intcloudsysops] [--config prd] [--dry-run]

Purpose:
  - Rotate compromised Google Service Account key in Doppler.
  - Mark previous key as compromised/rotated for audit traceability.

Notes:
  - Run from a trusted machine with Doppler auth.
  - This script does not print secret values.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --gcp-json-path)
      GCP_JSON_PATH="${2:-}"
      shift 2
      ;;
    --project)
      PROJECT="${2:-}"
      shift 2
      ;;
    --config)
      CONFIG="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[rotate-keys] unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${GCP_JSON_PATH}" ]]; then
  echo "[rotate-keys] --gcp-json-path is required" >&2
  exit 1
fi

if [[ ! -f "${GCP_JSON_PATH}" ]]; then
  echo "[rotate-keys] file not found: ${GCP_JSON_PATH}" >&2
  exit 1
fi

if ! command -v doppler >/dev/null 2>&1; then
  echo "[rotate-keys] doppler CLI is required" >&2
  exit 1
fi

ROTATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "[rotate-keys] project=${PROJECT} config=${CONFIG} dry_run=${DRY_RUN}"
echo "[rotate-keys] rotating GOOGLE_SERVICE_ACCOUNT_JSON and marking previous key as compromised"

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "[dry-run] doppler secrets set GOOGLE_SERVICE_ACCOUNT_JSON < ${GCP_JSON_PATH}"
  echo "[dry-run] doppler secrets set GCP_COMPROMISED_KEY_STATUS=rotated"
  echo "[dry-run] doppler secrets set GCP_COMPROMISED_KEY_ROTATED_AT=${ROTATED_AT}"
  exit 0
fi

doppler secrets set GOOGLE_SERVICE_ACCOUNT_JSON --project "${PROJECT}" --config "${CONFIG}" < "${GCP_JSON_PATH}"
doppler secrets set GCP_COMPROMISED_KEY_STATUS="rotated" --project "${PROJECT}" --config "${CONFIG}"
doppler secrets set GCP_COMPROMISED_KEY_ROTATED_AT="${ROTATED_AT}" --project "${PROJECT}" --config "${CONFIG}"

echo "[rotate-keys] rotation complete at ${ROTATED_AT}"
