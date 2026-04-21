#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=false
WORKFLOW_DIR="${OPSLY_REPO_ROOT:-/opt/opsly}/.n8n-temp/workflows"

usage() {
  cat <<'EOF'
Usage: scripts/n8n-import.sh [--dry-run]

Imports the newest workflow JSON from:
  $OPSLY_REPO_ROOT/.n8n-temp/workflows

Requirements:
  - n8n CLI available in PATH
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$WORKFLOW_DIR" ]]; then
  echo "Workflow directory not found: $WORKFLOW_DIR" >&2
  exit 1
fi

LATEST_FILE="$(ls -1t "$WORKFLOW_DIR"/*.json 2>/dev/null | awk 'NR==1')"
if [[ -z "${LATEST_FILE:-}" ]]; then
  echo "No workflow JSON files found in $WORKFLOW_DIR" >&2
  exit 1
fi

echo "Latest workflow file: $LATEST_FILE"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY-RUN] Would import workflow with n8n CLI."
  exit 0
fi

if ! command -v n8n >/dev/null 2>&1; then
  echo "n8n CLI not found in PATH" >&2
  exit 1
fi

echo "Importing workflow via n8n CLI..."
if n8n import:workflow --input="$LATEST_FILE"; then
  echo "Import successful using 'n8n import:workflow --input'."
  exit 0
fi

echo "Fallback import command..."
n8n import:workflow --separate --input="$LATEST_FILE"
echo "Import completed (fallback mode)."
