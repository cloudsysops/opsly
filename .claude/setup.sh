#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$ROOT_DIR/.claude/4-hooks"

DRY_RUN=0
SKIP_INSTALL=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: .claude/setup.sh [--dry-run] [--skip-install]"
      exit 1
      ;;
  esac
done

run_cmd() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

echo "[setup] Root: $ROOT_DIR"
cd "$ROOT_DIR"

echo "[setup] Checking required tools..."
command -v git >/dev/null
command -v node >/dev/null
command -v npm >/dev/null

if [[ ! -d "$HOOKS_DIR" ]]; then
  echo "[setup] Missing hooks directory: $HOOKS_DIR"
  exit 1
fi

echo "[setup] Installing dependencies..."
if [[ "$SKIP_INSTALL" -eq 1 ]]; then
  echo "[setup] --skip-install enabled"
else
  run_cmd npm ci
fi

echo "[setup] Setting hooks path..."
run_cmd git config core.hooksPath .claude/4-hooks

echo "[setup] Ensuring hook scripts are executable..."
run_cmd chmod +x .claude/4-hooks/pre-commit
run_cmd chmod +x .claude/4-hooks/commit-msg
run_cmd chmod +x .claude/4-hooks/pre-push

echo "[setup] Validating environment..."
run_cmd git config --get core.hooksPath

if npm run validate-structure >/dev/null 2>&1; then
  run_cmd npm run validate-structure
fi

if npm run type-check >/dev/null 2>&1; then
  run_cmd npm run type-check
fi

echo "[setup] Completed successfully."
