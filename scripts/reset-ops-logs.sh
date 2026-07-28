#!/usr/bin/env bash
# reset-ops-logs.sh — Archive + truncate ops logs for a clean production baseline.
# Usage:
#   ./scripts/reset-ops-logs.sh [--dry-run] [--keep-days N]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPS_ROOT="${OPSLY_ROOT:-${REPO_ROOT}}"
DRY_RUN=false
KEEP_DAYS=14
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --keep-days) KEEP_DAYS="${2:-14}"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--keep-days N]"
      exit 0
      ;;
    *) echo "Unknown: $1" >&2; exit 2 ;;
  esac
done

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

ARCHIVE_DIR="${OPS_ROOT}/runtime/logs/archive/${STAMP}"
LOG_DIRS=(
  "${OPS_ROOT}/runtime/logs"
)

echo "Reset ops logs under ${OPS_ROOT} (archive → ${ARCHIVE_DIR})"

TARGETS=(
  tenant-monitor.log
  tenant-monitor.cron.log
  tenant-monitor.alert-state
  disk-alert.cron.log
  disk-alert-cron.log
  feedback.log
  backup.log
  cleanup.log
  docker-prune.log
  vps-docker-housekeeping.log
  cursor-prompt-monitor.log
)

run mkdir -p "${ARCHIVE_DIR}"

for dir in "${LOG_DIRS[@]}"; do
  [[ -d "$dir" ]] || continue
  for name in "${TARGETS[@]}"; do
    path="${dir}/${name}"
    if [[ -f "$path" ]]; then
      size="$(wc -c <"$path" | tr -d ' ')"
      if [[ "$size" -gt 0 ]]; then
        run cp "$path" "${ARCHIVE_DIR}/$(basename "$dir")__${name}"
        if [[ "$DRY_RUN" == "true" ]]; then
          echo "[dry-run] truncate ${path}"
        else
          if : >"$path" 2>/dev/null; then
            echo "truncated ${path} (was ${size} bytes)"
          else
            echo "skip (no write permission): ${path}" >&2
          fi
        fi
      fi
    fi
  done
done

if [[ -d "${OPS_ROOT}/runtime/logs/archive" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    find "${OPS_ROOT}/runtime/logs/archive" -mindepth 1 -maxdepth 1 -type d -mtime "+${KEEP_DAYS}" -print || true
  else
    find "${OPS_ROOT}/runtime/logs/archive" -mindepth 1 -maxdepth 1 -type d -mtime "+${KEEP_DAYS}" -exec rm -rf {} + 2>/dev/null || true
  fi
fi

MARKER="${OPS_ROOT}/runtime/logs/BASELINE.txt"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] write ${MARKER}"
else
  cat >"$MARKER" <<EOF
Ops log baseline reset at ${STAMP} UTC
Purpose: detect NEW production errors after this timestamp.
Monitor: quiet OK lines; Discord WARN cooldown ${MONITOR_WARN_COOLDOWN_SEC:-21600}s; FAIL always alerts.
EOF
  echo "Wrote ${MARKER}"
fi

echo "Done. Tail from now: tail -f ${OPS_ROOT}/runtime/logs/tenant-monitor.cron.log"
