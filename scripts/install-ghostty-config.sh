#!/usr/bin/env bash
# Install Opsly Ghostty config into macOS Application Support (symlink, idempotent).
#
# Usage:
#   ./scripts/install-ghostty-config.sh [--dry-run]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SRC="${REPO_ROOT}/config/ghostty/config"
DEST_DIR="${HOME}/Library/Application Support/com.mitchellh.ghostty"
DEST="${DEST_DIR}/config"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      sed -n '1,10p' "$0" | tail -n +2
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

if [[ ! -f "${SRC}" ]]; then
  echo "install-ghostty-config: missing ${SRC}" >&2
  exit 1
fi

if ! [[ -d "/Applications/Ghostty.app" ]]; then
  echo "install-ghostty-config: Ghostty.app not found in /Applications" >&2
  echo "Install: https://ghostty.org/download" >&2
  exit 1
fi

run() {
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

run mkdir -p "${DEST_DIR}"

if [[ -e "${DEST}" && ! -L "${DEST}" ]]; then
  backup="${DEST}.bak.$(date +%Y%m%d%H%M%S)"
  echo "install-ghostty-config: backing up existing file to ${backup}"
  run mv "${DEST}" "${backup}"
fi

run ln -sf "${SRC}" "${DEST}"

GHOSTTY_BIN="/Applications/Ghostty.app/Contents/MacOS/ghostty"
if [[ -x "${GHOSTTY_BIN}" ]]; then
  if [[ "${DRY_RUN}" == "true" ]]; then
    echo "[dry-run] ${GHOSTTY_BIN} +validate-config"
  else
    if ! "${GHOSTTY_BIN}" +validate-config 2>&1; then
      echo "install-ghostty-config: validate failed (check config syntax)" >&2
      exit 1
    fi
    echo "install-ghostty-config: config OK at ${DEST}"
    echo "Reload in Ghostty: Cmd+Shift+, or quit (Cmd+Q) and reopen."
  fi
else
  echo "install-ghostty-config: linked ${DEST} -> ${SRC}"
fi
