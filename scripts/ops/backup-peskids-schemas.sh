#!/usr/bin/env bash
# Dump Peskids application schemas. tenant_peskids is a Docker project name,
# not a Postgres schema — daily backup-tenants.sh does not cover this data.
#
# Usage:
#   ./scripts/ops/backup-peskids-schemas.sh --dry-run
#   ./scripts/ops/backup-peskids-schemas.sh --out /tmp/peskids-backup.sql.gz
#
# Required for execute: DB_CONNECTION_STRING
# Never prints the connection string. Never restores into production.
set -euo pipefail

DRY_RUN=false
OUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --out) OUT_FILE="${2:-}"; shift 2 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "${PESKIDS_RESTORE_TARGET:-}" == "production" ]]; then
  echo "Refusing restore target=production. Restore only to an isolated project." >&2
  exit 1
fi

OUT_FILE="${OUT_FILE:-/tmp/peskids-schemas-$(date -u +%Y%m%dT%H%M%SZ).sql.gz}"

echo "[peskids-backup] schemas=peskids + platform.peskids_* + public operational tables"
echo "[peskids-backup] out=${OUT_FILE}"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[peskids-backup] DRY-RUN: pg_dump -n peskids -t platform.peskids_* -t public.leads|students|feedback|followups|messages|classes"
  echo "[peskids-backup] DRY-RUN: gzip > ${OUT_FILE} && sha256sum ${OUT_FILE}"
  exit 0
fi

if [[ -z "${DB_CONNECTION_STRING:-}" ]]; then
  echo "DB_CONNECTION_STRING is required for execute (not printed)." >&2
  exit 3
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required" >&2
  exit 2
fi

pg_dump "${DB_CONNECTION_STRING}" \
  --no-owner --no-acl \
  -n peskids \
  -t 'platform.peskids_*' \
  -t public.leads \
  -t public.students \
  -t public.feedback \
  -t public.followups \
  -t public.messages \
  -t public.classes \
  | gzip -c >"${OUT_FILE}"

sha256sum "${OUT_FILE}"
echo "[peskids-backup] wrote ${OUT_FILE}"
