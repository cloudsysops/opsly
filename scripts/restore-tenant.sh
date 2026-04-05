#!/usr/bin/env bash
# Restore a tenant schema from S3 backup (destructive).
#
# Required env:
#   DB_CONNECTION_STRING, S3_BUCKET, AWS_REGION
# Optional env:
#   S3_PREFIX (default: opsly/backups)
#
# Exit codes: 0 ok, 1 general error, 2 missing dependency, 3 missing env

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"

export DRY_RUN="${DRY_RUN:-false}"
export ASSUME_YES="${ASSUME_YES:-false}"

SLUG=""
RESTORE_DATE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)
      SLUG="${2:-}"
      shift 2
      ;;
    --date)
      RESTORE_DATE="${2:-}"
      shift 2
      ;;
    --dry-run)
      export DRY_RUN=true
      shift
      ;;
    --yes)
      export ASSUME_YES=true
      shift
      ;;
    *)
      die "Unknown argument: $1" 1
      ;;
  esac
done

if [[ -z "${SLUG}" || -z "${RESTORE_DATE}" ]]; then
  die "Required: --slug and --date (YYYY-MM-DD)" 1
fi

if [[ ! "${SLUG}" =~ ^[a-z0-9-]{3,30}$ ]]; then
  die "Invalid slug format" 1
fi

if ! [[ "${RESTORE_DATE}" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  die "Invalid --date (expected YYYY-MM-DD)" 1
fi

require_env DB_CONNECTION_STRING S3_BUCKET AWS_REGION
require_cmd aws gunzip psql jq

S3_PREFIX="${S3_PREFIX:-opsly/backups}"
S3_KEY="${S3_PREFIX}/${RESTORE_DATE}/${SLUG}.sql.gz"
S3_URI="s3://${S3_BUCKET}/${S3_KEY}"
LOCAL_GZ="/tmp/intcloudsysops_restore_${SLUG}_${RESTORE_DATE}.sql.gz"
LOCAL_SQL="/tmp/intcloudsysops_restore_${SLUG}_${RESTORE_DATE}.sql"
SCHEMA_NAME="tenant_${SLUG}"

if [[ "${DRY_RUN}" != "true" ]]; then
  if [[ ! -t 0 ]] && [[ "${ASSUME_YES}" != "true" ]]; then
    die "Refusing non-interactive restore (stdin is not a TTY). Re-run with --yes." 1
  fi
fi

log_warn "DESTRUCTIVE: This will DROP schema ${SCHEMA_NAME} and replace it from ${S3_URI}"

if ! confirm "Proceed with restore of ${SLUG} from ${RESTORE_DATE}?"; then
  die "Aborted by user" 1
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  log_info "DRY-RUN: aws s3 ls ${S3_URI}"
  log_info "DRY-RUN: aws s3 cp ${S3_URI} ${LOCAL_GZ}"
  log_info "DRY-RUN: gunzip -> ${LOCAL_SQL}"
  log_info "DRY-RUN: psql DROP/CREATE SCHEMA \"${SCHEMA_NAME}\" and restore SQL"
  log_info "DRY-RUN: verify table count in ${SCHEMA_NAME}"
  exit 0
fi

if ! aws s3 ls "${S3_URI}" --region "${AWS_REGION}" >/dev/null 2>&1; then
  die "S3 object not found: ${S3_URI}" 1
fi

log_info "Downloading ${S3_URI}"
aws s3 cp "${S3_URI}" "${LOCAL_GZ}" --region "${AWS_REGION}"

gunzip -c "${LOCAL_GZ}" >"${LOCAL_SQL}"
rm -f "${LOCAL_GZ}"

log_info "Dropping schema (if exists)"
psql "${DB_CONNECTION_STRING}" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS \"${SCHEMA_NAME}\" CASCADE;"

log_info "Applying SQL dump"
psql "${DB_CONNECTION_STRING}" -v ON_ERROR_STOP=1 -f "${LOCAL_SQL}"

TCOUNT="$(
  psql "${DB_CONNECTION_STRING}" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${SCHEMA_NAME}';" | tr -d ' '
)"
log_info "Tables in schema ${SCHEMA_NAME}: ${TCOUNT}"

rm -f "${LOCAL_SQL}"
log_info "Restore finished successfully for slug=${SLUG} date=${RESTORE_DATE}"
