#!/usr/bin/env bash
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"

DRY_RUN=0
for arg in "$@"; do
  if [[ "${arg}" == "--dry-run" ]]; then
    DRY_RUN=1
    break
  fi
done

check_env SUPABASE_SERVICE_ROLE_KEY SUPABASE_URL AWS_S3_BUCKET AWS_S3_REGION DB_CONNECTION_STRING
require_command jq curl aws pg_dump gzip

TENANTS_JSON="$(
  curl -sS -G "${SUPABASE_URL}/rest/v1/tenants" \
    --data-urlencode "select=slug,owner_email" \
    --data-urlencode "status=eq.active" \
    --data-urlencode "deleted_at=is.null" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Accept-Profile: platform"
)"

if ! echo "${TENANTS_JSON}" | jq -e . >/dev/null 2>&1; then
  log_error "Failed to fetch tenants from Supabase: ${TENANTS_JSON}"
  exit 1
fi

DATE_UTC="$(date -u +%Y-%m-%d)"
COUNT=0

while IFS= read -r slug; do
  [[ -z "${slug}" ]] && continue
  COUNT=$((COUNT + 1))
  tmp_sql_gz="/tmp/${slug}_${DATE_UTC}.sql.gz"
  s3_key="opsly/backups/${DATE_UTC}/${slug}.sql.gz"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log_info "DRY RUN: pg_dump schema tenant_${slug} | gzip > ${tmp_sql_gz}"
    log_info "DRY RUN: aws s3 cp ${tmp_sql_gz} s3://${AWS_S3_BUCKET}/${s3_key}"
    continue
  fi

  log_info "Backing up tenant schema: tenant_${slug}"
  if ! pg_dump "${DB_CONNECTION_STRING}" -n "tenant_${slug}" --no-owner --no-acl | gzip -c >"${tmp_sql_gz}"; then
    log_error "pg_dump failed for slug=${slug}"
    rm -f "${tmp_sql_gz}"
    exit 1
  fi

  aws s3 cp "${tmp_sql_gz}" "s3://${AWS_S3_BUCKET}/${s3_key}" --region "${AWS_S3_REGION}"
  rm -f "${tmp_sql_gz}"
done < <(echo "${TENANTS_JSON}" | jq -r '.[].slug')

if [[ "${DRY_RUN}" -eq 1 ]]; then
  log_info "DRY RUN: prune S3 backups older than 30 days under s3://${AWS_S3_BUCKET}/opsly/backups/"
  log_info "Backup complete (dry run): ${COUNT} tenants"
  exit 0
fi

CUTOFF_DATE=""
if CUTOFF_DATE="$(date -u -d "30 days ago" +%Y-%m-%d 2>/dev/null)"; then
  :
elif CUTOFF_DATE="$(date -u -v-30d +%Y-%m-%d 2>/dev/null)"; then
  :
else
  log_warn "Could not compute cutoff date; skipping S3 prune"
  CUTOFF_DATE=""
fi

if [[ -n "${CUTOFF_DATE}" ]]; then
  log_info "Pruning backup date prefixes strictly before ${CUTOFF_DATE} (UTC)"
fi

while IFS= read -r line; do
  [[ -z "${line}" ]] && continue
  [[ "${line}" != *"PRE"* ]] && continue
  [[ -z "${CUTOFF_DATE}" ]] && break
  dir_token="${line##*PRE }"
  dir_token="${dir_token//[[:space:]]/}"
  prefix_date="${dir_token%/}"
  [[ -z "${prefix_date}" ]] && continue
  if ! [[ "${prefix_date}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    continue
  fi
  if [[ "${prefix_date}" < "${CUTOFF_DATE}" ]]; then
    log_info "Deleting s3://${AWS_S3_BUCKET}/opsly/backups/${prefix_date}/"
    aws s3 rm "s3://${AWS_S3_BUCKET}/opsly/backups/${prefix_date}/" --recursive --region "${AWS_S3_REGION}"
  fi
done < <(aws s3 ls "s3://${AWS_S3_BUCKET}/opsly/backups/" --region "${AWS_S3_REGION}" 2>/dev/null || true)

log_info "Backup complete: ${COUNT} tenants"
