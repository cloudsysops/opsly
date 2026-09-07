#!/usr/bin/env bash
# Snapshot público de salud (pre o post). No muta estado.
# Uso: ./scripts/ci/night-cleanup-review.sh --phase pre|post --out FILE
set -euo pipefail

PHASE=""
OUT=""
TIMEOUT="${NIGHT_CLEANUP_CURL_TIMEOUT:-20}"
PLATFORM_DOMAIN="${PLATFORM_DOMAIN:-op-sly.com}"
API_URL="${SMOKE_API_URL:-https://api.${PLATFORM_DOMAIN}/api/health}"
PESKIDS_URL="${SMOKE_PESKIDS_URL:-https://www.peskids.com/api/health}"
STAGING_URL="${SMOKE_STAGING_URL:-https://peskids-staging.op-sly.com/api/health}"

usage() {
  echo "Uso: $0 --phase pre|post --out <json>"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --phase) PHASE="${2:?}"; shift 2 ;;
    --out) OUT="${2:?}"; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    *)
      echo "Opción desconocida: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "${PHASE}" != "pre" && "${PHASE}" != "post" ]]; then
  echo "--phase debe ser pre o post" >&2
  exit 1
fi
if [[ -z "${OUT}" ]]; then
  echo "--out es obligatorio" >&2
  exit 1
fi

probe() {
  local url="$1"
  local code
  code="$(curl -sk -o /dev/null -w '%{http_code}' --max-time "${TIMEOUT}" "${url}" || true)"
  if [[ -z "${code}" ]]; then
    code="000"
  fi
  printf '%s' "${code}"
}

mkdir -p "$(dirname "${OUT}")"
api_code="$(probe "${API_URL}")"
peskids_code="$(probe "${PESKIDS_URL}")"
staging_code="$(probe "${STAGING_URL}")"

jq -n \
  --arg phase "${PHASE}" \
  --arg capturedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg apiUrl "${API_URL}" \
  --arg apiCode "${api_code}" \
  --arg peskidsUrl "${PESKIDS_URL}" \
  --arg peskidsCode "${peskids_code}" \
  --arg stagingUrl "${STAGING_URL}" \
  --arg stagingCode "${staging_code}" \
  '{
    phase: $phase,
    capturedAt: $capturedAt,
    health: {
      api: { url: $apiUrl, http: ($apiCode | tonumber) },
      peskids: { url: $peskidsUrl, http: ($peskidsCode | tonumber) },
      staging: { url: $stagingUrl, http: ($stagingCode | tonumber) }
    }
  }' >"${OUT}"

printf '[night-cleanup-review] %s api=%s peskids=%s staging=%s -> %s\n' \
  "${PHASE}" "${api_code}" "${peskids_code}" "${staging_code}" "${OUT}"
