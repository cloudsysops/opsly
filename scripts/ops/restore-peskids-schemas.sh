#!/usr/bin/env bash
# Restore a Peskids application backup into an isolated Postgres target.
#
# Default safety model:
# - source backup may come from S3/R2 or a local file;
# - target MUST be RESTORE_DB_CONNECTION_STRING;
# - if target equals DB_CONNECTION_STRING (production/source), fail closed;
# - production restore is not supported by this script.
#
# Examples:
#   ./scripts/ops/restore-peskids-schemas.sh --dry-run --date 2026-09-11
#   ./scripts/ops/restore-peskids-schemas.sh --date 2026-09-11
#   ./scripts/ops/restore-peskids-schemas.sh --file /tmp/peskids.sql.gz
set -euo pipefail

DRY_RUN=false
BACKUP_DATE=""
LOCAL_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --date) BACKUP_DATE="${2:-}"; shift 2 ;;
    --file) LOCAL_FILE="${2:-}"; shift 2 ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${RESTORE_DB_CONNECTION_STRING:-}" ]]; then
  echo "RESTORE_DB_CONNECTION_STRING is required; use an isolated scratch Postgres/Supabase target." >&2
  exit 3
fi

if [[ -n "${DB_CONNECTION_STRING:-}" && "${RESTORE_DB_CONNECTION_STRING}" == "${DB_CONNECTION_STRING}" ]]; then
  echo "Refusing restore: RESTORE_DB_CONNECTION_STRING matches DB_CONNECTION_STRING." >&2
  echo "This script restores only to an isolated target." >&2
  exit 1
fi

for cmd in psql gzip sha256sum; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command not found: $cmd" >&2
    exit 2
  fi
done

TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/opsly-peskids-restore.XXXXXX")"
cleanup() { rm -rf "$TMP_ROOT"; }
trap cleanup EXIT

BACKUP_FILE=""
SHA_FILE=""

if [[ -n "$LOCAL_FILE" ]]; then
  BACKUP_FILE="$LOCAL_FILE"
  SHA_FILE="${LOCAL_FILE}.sha256"
  if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "Backup file not found: $BACKUP_FILE" >&2
    exit 1
  fi
  if [[ ! -f "$SHA_FILE" ]]; then
    echo "Checksum file not found: $SHA_FILE" >&2
    exit 1
  fi
else
  : "${S3_BUCKET:?S3_BUCKET is required when --file is not used}"
  : "${AWS_REGION:?AWS_REGION is required when --file is not used}"
  if ! command -v aws >/dev/null 2>&1; then
    echo "aws CLI is required for object-storage restore" >&2
    exit 2
  fi

  BACKUP_DATE="${BACKUP_DATE:-$(date -u +%Y-%m-%d)}"
  S3_PREFIX="${S3_PREFIX:-opsly/backups/peskids}"
  AWS_ARGS=(--region "${AWS_REGION}")
  if [[ -n "${S3_ENDPOINT_URL:-}" ]]; then
    AWS_ARGS+=(--endpoint-url "${S3_ENDPOINT_URL}")
  fi

  mapfile -t OBJECTS < <(
    aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_DATE}/" "${AWS_ARGS[@]}" 2>/dev/null       | awk '{print $4}'       | grep -E '^peskids-schemas-.*\.sql\.gz$'       | sort
  )

  if [[ "${#OBJECTS[@]}" -eq 0 ]]; then
    echo "No Peskids backup found for date=$BACKUP_DATE" >&2
    exit 1
  fi

  OBJECT="${OBJECTS[-1]}"
  BACKUP_FILE="$TMP_ROOT/$OBJECT"
  SHA_FILE="${BACKUP_FILE}.sha256"
  SRC="s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_DATE}/${OBJECT}"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[peskids-restore] DRY-RUN: download $SRC and checksum"
  else
    aws s3 cp "$SRC" "$BACKUP_FILE" "${AWS_ARGS[@]}"
    aws s3 cp "${SRC}.sha256" "$SHA_FILE" "${AWS_ARGS[@]}"
  fi
fi

echo "[peskids-restore] target=isolated"
echo "[peskids-restore] backup=$(basename "$BACKUP_FILE")"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[peskids-restore] DRY-RUN: verify SHA256"
  echo "[peskids-restore] DRY-RUN: gzip -cd backup | psql RESTORE_DB_CONNECTION_STRING"
  echo "[peskids-restore] DRY-RUN: no production target permitted"
  exit 0
fi

EXPECTED="$(awk '{print $1}' "$SHA_FILE" | head -n1)"
ACTUAL="$(sha256sum "$BACKUP_FILE" | awk '{print $1}')"
if [[ -z "$EXPECTED" || "$EXPECTED" != "$ACTUAL" ]]; then
  echo "Checksum mismatch; refusing restore." >&2
  exit 1
fi

echo "[peskids-restore] checksum verified"

# Fail before mutating if the archive cannot be decompressed.
gzip -t "$BACKUP_FILE"

# Restore into the isolated target. The archive contains the real Peskids/public/platform
# object names and should therefore be restored into a dedicated scratch database/project.
gzip -cd "$BACKUP_FILE" | psql "${RESTORE_DB_CONNECTION_STRING}" -v ON_ERROR_STOP=1

echo "[peskids-restore] restore complete"
echo "[peskids-restore] NEXT: run DB assurance + row-count/application smoke against the isolated target."
