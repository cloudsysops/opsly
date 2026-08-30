#!/usr/bin/env bash
# Escribe .cursor/responses/response-<job_id>.md (contrato del cursor-agent-service).
#
# Usage:
#   ./scripts/ops/complete-cursor-job.sh --job-id <uuid> --content "pong"
#   ./scripts/ops/complete-cursor-job.sh --job-id <uuid> --file notes.md
#
set -euo pipefail

JOB_ID=""
CONTENT=""
FILE=""

args=("$@")
for i in "${!args[@]}"; do
  case "${args[$i]}" in
    --job-id) JOB_ID="${args[$((i + 1))]:-}" ;;
    --content) CONTENT="${args[$((i + 1))]:-}" ;;
    --file) FILE="${args[$((i + 1))]:-}" ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
  esac
done

if [[ -z "$JOB_ID" ]]; then
  echo "[complete-cursor-job] ERROR: --job-id required" >&2
  exit 1
fi

if [[ -n "$FILE" ]]; then
  [[ -f "$FILE" ]] || { echo "[complete-cursor-job] ERROR: file not found: $FILE" >&2; exit 1; }
  CONTENT="$(cat "$FILE")"
fi

if [[ -z "$CONTENT" ]]; then
  CONTENT="done"
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESP_DIR="${ROOT}/.cursor/responses"
mkdir -p "$RESP_DIR"
OUT="${RESP_DIR}/response-${JOB_ID}.md"
{
  echo "---"
  echo "job_id: ${JOB_ID}"
  echo "completed_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "---"
  echo
  printf '%s\n' "$CONTENT"
} >"$OUT"
echo "[complete-cursor-job] wrote $OUT"
