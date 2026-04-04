#!/usr/bin/env bash
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"

SLUG=""
RESTORE_DATE=""
DRY_RUN=0

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
      DRY_RUN=1
      shift
      ;;
    *)
      log_error "Unknown argument: $1"
      exit 1
      ;;
  esac
done

if [[ -z "${SLUG}" || -z "${RESTORE_DATE}" ]]; then
  log_error "Required: --slug and --date"
  exit 1
fi

check_env DB_CONNECTION_STRING AWS_S3_BUCKET
require_command aws

S3_URI="s3://${AWS_S3_BUCKET}/opsly/backups/${RESTORE_DATE}/${SLUG}.sql.gz"
LOCAL_GZ="/tmp/${SLUG}_${RESTORE_DATE}_restore.sql.gz"

if [[ "${DRY_RUN}" -eq 1 ]]; then
  log_info "DRY RUN: aws s3 cp ${S3_URI} ${LOCAL_GZ}"
  log_info "DRY RUN: gunzip -c ${LOCAL_GZ} | psql \"\${DB_CONNECTION_STRING}\""
  exit 0
fi

log_info "Downloading ${S3_URI}"
aws s3 cp "${S3_URI}" "${LOCAL_GZ}"

log_warn "TODO: Verify target database, extensions, and ownership before piping a full SQL dump."
log_warn "TODO: For production restores, prefer pg_restore format or a reviewed SQL script."
log_warn "TODO: Example (after manual review): gunzip -c \"${LOCAL_GZ}\" | psql \"\${DB_CONNECTION_STRING}\""

# TODO: Implement non-interactive restore once dump format and target schema policy are finalized.
# gunzip -c "${LOCAL_GZ}" | psql "${DB_CONNECTION_STRING}" -v ON_ERROR_STOP=1

rm -f "${LOCAL_GZ}"
log_info "Restore stub finished (SQL not applied; see TODO above)."
