#!/usr/bin/env bash
# Test NotebookLM Agent workflow (experimental)

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${_SCRIPT_DIR}/lib/common.sh"

DRY_RUN="${DRY_RUN:-false}"
PDF_PATH="${PDF_PATH:-}"
TENANT="${TENANT:-localrank}"
NOTEBOOK_NAME="${NOTEBOOK_NAME:-Test Notebook}"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/notebooklm-output}"

show_help() {
  cat <<'EOF'
Test NotebookLM workflow: PDF → notebook → podcast + slides

Usage:
  ./scripts/test-notebooklm.sh --pdf-path <path> [--tenant <slug>] [--dry-run]

Options:
  --pdf-path PATH        Path to PDF file (required)
  --tenant SLUG          Tenant slug (default: localrank)
  --name NAME            Notebook name (default: Test Notebook)
  --output-dir PATH      Output directory (default: /tmp/notebooklm-output)
  --dry-run              Show plan without executing
  -h, --help             This help

Examples:
  ./scripts/test-notebooklm.sh --pdf-path /tmp/report.pdf --dry-run
  ./scripts/test-notebooklm.sh --pdf-path /tmp/report.pdf --tenant localrank

EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pdf-path)
      PDF_PATH="${2:-}"
      shift 2
      ;;
    --tenant)
      TENANT="${2:-}"
      shift 2
      ;;
    --name)
      NOTEBOOK_NAME="${2:-}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h | --help)
      show_help
      exit 0
      ;;
    *)
      die "Unknown argument: $1" 1
      ;;
  esac
done

if [[ -z "${PDF_PATH}" ]]; then
  die "Required: --pdf-path" 1
fi

if [[ ! -f "${PDF_PATH}" ]]; then
  die "PDF not found: ${PDF_PATH}" 1
fi

# Verify dependencies
if ! command -v python3 &>/dev/null; then
  die "python3 not found" 2
fi

if ! python3 -c "import notebooklm" 2>/dev/null; then
  warn "notebooklm-py not installed; install with:"
  warn "  python3 -m pip install notebooklm-py[browser]>=0.3.4"
  if [[ "${DRY_RUN}" != "true" ]]; then
    die "Cannot continue without notebooklm-py" 1
  fi
fi

if [[ "${NOTEBOOKLM_ENABLED:-}" != "true" ]]; then
  warn "NOTEBOOKLM_ENABLED is not true"
  if [[ "${DRY_RUN}" != "true" ]]; then
    die "NotebookLM disabled" 1
  fi
fi

mkdir -p "${OUTPUT_DIR}"

log "🤖 NotebookLM Test Workflow"
log "  PDF: ${PDF_PATH}"
log "  Tenant: ${TENANT}"
log "  Output: ${OUTPUT_DIR}"

if [[ "${DRY_RUN}" == "true" ]]; then
  log "DRY-RUN: Would execute workflow"
  log "  1. Create notebook: '${NOTEBOOK_NAME}'"
  log "  2. Add PDF source"
  log "  3. Generate podcast"
  log "  4. Generate slides"
  log "  5. Generate infographic"
  log ""
  log "To execute: unset DRY_RUN or remove --dry-run"
  exit 0
fi

# Execute workflow
log "Executing workflow..."
python3 "${_SCRIPT_DIR}/../apps/agents/notebooklm/src/workflows/report-to-podcast.py" \
  --pdf-path "${PDF_PATH}" \
  --notebook-name "${NOTEBOOK_NAME}" \
  --storage-path "${HOME}/.notebooklm_storage" \
  --output-dir "${OUTPUT_DIR}"

if [[ $? -eq 0 ]]; then
  log "✅ Workflow completed"
  log "Output directory: ${OUTPUT_DIR}"
  ls -lh "${OUTPUT_DIR}"
else
  die "Workflow failed" 1
fi
