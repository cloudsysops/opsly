#!/usr/bin/env bash
# Backup active tenant schemas to S3 (cron-safe: no prompts).
#
# Required env:
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DB_CONNECTION_STRING,
#   S3_BUCKET, AWS_REGION
# Optional env:
#   S3_PREFIX (default: opsly/backups), DISCORD_WEBHOOK_URL
#
# Exit codes: 0 ok, 1 error / backup failures, 2 missing dependency, 3 missing env

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"

export DRY_RUN="${DRY_RUN:-false}"
FILTER_SLUG=""
BACKUP_DATE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      export DRY_RUN=true
      shift
      ;;
    --slug)
      FILTER_SLUG="${2:-}"
      shift 2
      ;;
    --date)
      BACKUP_DATE="${2:-}"
      shift 2
      ;;
    *)
      die "Unknown argument: $1" 1
      ;;
  esac
done

require_env SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY DB_CONNECTION_STRING S3_BUCKET AWS_REGION
require_cmd jq curl aws pg_dump gzip

S3_PREFIX="${S3_PREFIX:-opsly/backups}"
DATE_UTC="${BACKUP_DATE:-$(date -u +%Y-%m-%d)}"

if [[ -n "${BACKUP_DATE}" ]] && ! [[ "${BACKUP_DATE}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  die "Invalid --date (expected YYYY-MM-DD)" 1
fi

notify_discord() {
  local text="$1"
  [[ -z "${DISCORD_WEBHOOK_URL:-}" ]] && return 0
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: Discord notify skipped"
    return 0
  fi
  curl -sS -X POST "${DISCORD_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg c "${text}" '{content: $c}')" >/dev/null || true
}

TMP_ROOT="/tmp/intcloudsysops/${DATE_UTC}"
run mkdir -p "${TMP_ROOT}"

fetch_slugs() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: GET ${SUPABASE_URL}/rest/v1/tenants (active, not deleted)"
    if [[ -n "${FILTER_SLUG}" ]]; then
      echo "${FILTER_SLUG}"
    fi
    return 0
  fi

  local -a curl_args=(
    -sS -G "${SUPABASE_URL}/rest/v1/tenants"
    --data-urlencode "select=slug"
    --data-urlencode "status=eq.active"
    --data-urlencode "deleted_at=is.null"
  )
  if [[ -n "${FILTER_SLUG}" ]]; then
    curl_args+=(--data-urlencode "slug=eq.${FILTER_SLUG}")
  fi
  curl_args+=(
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}"
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
    -H "Accept-Profile: platform"
  )

  local json
  json="$(curl "${curl_args[@]}")"
  if ! echo "${json}" | jq -e . >/dev/null 2>&1; then
    die "Failed to fetch tenants: ${json}" 1
  fi
  echo "${json}" | jq -r '.[].slug'
}

FAILED=()
SUCCESS_COUNT=0

while IFS= read -r slug; do
  [[ -z "${slug}" ]] && continue

  tmp_sql_gz="${TMP_ROOT}/${slug}.sql.gz"
  s3_key="${S3_PREFIX}/${DATE_UTC}/${slug}.sql.gz"
  s3_uri="s3://${S3_BUCKET}/${s3_key}"

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: pg_dump -n tenant_${slug} ... | gzip > ${tmp_sql_gz}"
    log_info "DRY-RUN: aws s3 cp ${tmp_sql_gz} ${s3_uri} --region ${AWS_REGION}"
    log_info "DRY-RUN: aws s3 ls ${s3_uri}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    continue
  fi

  log_info "Backing up schema tenant_${slug}"
  if ! pg_dump "${DB_CONNECTION_STRING}" -n "tenant_${slug}" --no-owner --no-acl 2>/dev/null | gzip -c >"${tmp_sql_gz}"; then
    log_error "pg_dump failed for slug=${slug}"
    FAILED+=("${slug}")
    rm -f "${tmp_sql_gz}"
    continue
  fi

  if ! aws s3 cp "${tmp_sql_gz}" "${s3_uri}" --region "${AWS_REGION}"; then
    log_error "S3 upload failed for slug=${slug}"
    FAILED+=("${slug}")
    rm -f "${tmp_sql_gz}"
    continue
  fi

  if ! aws s3 ls "${s3_uri}" --region "${AWS_REGION}" >/dev/null 2>&1; then
    log_error "S3 verify failed for slug=${slug}"
    FAILED+=("${slug}")
    rm -f "${tmp_sql_gz}"
    continue
  fi

  rm -f "${tmp_sql_gz}"
  SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  log_info "Uploaded ${s3_uri}"
done < <(fetch_slugs)

run rm -rf "${TMP_ROOT}"

FAIL_COUNT="${#FAILED[@]}"
SUMMARY="Backup ${DATE_UTC}: ${SUCCESS_COUNT} ok, ${FAIL_COUNT} failed."
if [[ "${FAIL_COUNT}" -gt 0 ]]; then
  SUMMARY+=" Failed: ${FAILED[*]}"
fi
notify_discord "${SUMMARY}"

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN complete (${SUCCESS_COUNT} simulated tenants)"
  exit 0
fi

log_info "${SUMMARY}"
if [[ "${FAIL_COUNT}" -gt 0 ]]; then
  exit 1
fi
exit 0
