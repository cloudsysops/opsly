#!/usr/bin/env bash
set -euo pipefail

PROJECT="${PROJECT:-ops-intcloudsysops}"
CONFIG="${CONFIG:-prd}"
GCP_JSON_PATH=""
DRY_RUN=false
DELETE_JSON_AFTER_VERIFY=true

usage() {
  cat <<'EOF'
Usage:
  ./scripts/rotate-keys.sh --gcp-json-path /secure/new-service-account.json [--project ops-intcloudsysops] [--config prd] [--dry-run] [--keep-json]

Purpose:
  - Rotate compromised Google Service Account key in Doppler.
  - Mark previous key as compromised/rotated for audit traceability.

Notes:
  - Run from a trusted machine with Doppler auth.
  - This script does not print secret values.
  - By default, the local JSON file is deleted after successful verification.
  - Use --keep-json to preserve the local file.
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
    --keep-json)
      DELETE_JSON_AFTER_VERIFY=false
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
if ! command -v jq >/dev/null 2>&1; then
  echo "[rotate-keys] jq is required" >&2
  exit 1
fi

ROTATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "[rotate-keys] project=${PROJECT} config=${CONFIG} dry_run=${DRY_RUN}"
echo "[rotate-keys] rotating GOOGLE_SERVICE_ACCOUNT_JSON and marking previous key as compromised"

doppler_set_from_file_quiet() {
  local secret_name="${1:?secret_name required}"
  local file_path="${2:?file_path required}"
  # Never print secret tables/values to stdout.
  doppler secrets set "${secret_name}" --project "${PROJECT}" --config "${CONFIG}" < "${file_path}" >/dev/null
}

doppler_set_value_quiet() {
  local secret_name="${1:?secret_name required}"
  local secret_value="${2:?secret_value required}"
  # Never print secret tables/values to stdout.
  doppler secrets set "${secret_name}=${secret_value}" --project "${PROJECT}" --config "${CONFIG}" >/dev/null
}

verify_secret_loaded() {
  local expected_client_email expected_private_key_id loaded_json loaded_client_email loaded_private_key_id
  expected_client_email="$(jq -r '.client_email // empty' "${GCP_JSON_PATH}")"
  expected_private_key_id="$(jq -r '.private_key_id // empty' "${GCP_JSON_PATH}")"

  if [[ -z "${expected_client_email}" || -z "${expected_private_key_id}" ]]; then
    echo "[rotate-keys] input JSON missing client_email/private_key_id" >&2
    return 1
  fi

  loaded_json="$(doppler secrets get GOOGLE_SERVICE_ACCOUNT_JSON --project "${PROJECT}" --config "${CONFIG}" --plain)"
  loaded_client_email="$(printf '%s' "${loaded_json}" | jq -r '.client_email // empty')"
  loaded_private_key_id="$(printf '%s' "${loaded_json}" | jq -r '.private_key_id // empty')"

  if [[ "${loaded_client_email}" != "${expected_client_email}" || "${loaded_private_key_id}" != "${expected_private_key_id}" ]]; then
    echo "[rotate-keys] verification failed: Doppler value does not match input key identity" >&2
    return 1
  fi

  echo "[rotate-keys] verification OK (client_email/private_key_id match)"
}

if [[ "${DRY_RUN}" == "true" ]]; then
  echo "[dry-run] doppler secrets set GOOGLE_SERVICE_ACCOUNT_JSON < ${GCP_JSON_PATH}"
  echo "[dry-run] doppler secrets set GCP_COMPROMISED_KEY_STATUS=rotated"
  echo "[dry-run] doppler secrets set GCP_COMPROMISED_KEY_ROTATED_AT=${ROTATED_AT}"
  exit 0
fi

doppler_set_from_file_quiet "GOOGLE_SERVICE_ACCOUNT_JSON" "${GCP_JSON_PATH}"
doppler_set_value_quiet "GCP_COMPROMISED_KEY_STATUS" "rotated"
doppler_set_value_quiet "GCP_COMPROMISED_KEY_ROTATED_AT" "${ROTATED_AT}"
verify_secret_loaded

if [[ "${DELETE_JSON_AFTER_VERIFY}" == "true" ]]; then
  rm -f "${GCP_JSON_PATH}"
  echo "[rotate-keys] local JSON file deleted after successful verification"
else
  echo "[rotate-keys] local JSON file retained (--keep-json)"
fi

echo "[rotate-keys] rotation complete at ${ROTATED_AT}"
