#!/usr/bin/env bash
# Install the canonical Opsly Ghostty profile.
#   macOS: symlink config/ghostty/config into Application Support.
#   Linux: generate ~/.config/ghostty/config from the canonical base plus the
#          Linux harness override.
#
# Usage:
#   ./scripts/install-ghostty-config.sh [--dry-run]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SRC="${REPO_ROOT}/config/ghostty/config"
LINUX_OVERRIDE="${REPO_ROOT}/config/ghostty/config.linux-override"
LINUX_HARNESS="${REPO_ROOT}/scripts/ghostty-linux-harness.sh"
DRY_RUN=false
OS="$(uname -s)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      sed -n '1,14p' "$0" | tail -n +2
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

if [[ ! -f "$SRC" ]]; then
  echo "install-ghostty-config: missing $SRC" >&2
  exit 1
fi

case "$OS" in
  Darwin)
    DEST_DIR="${HOME}/Library/Application Support/com.mitchellh.ghostty"
    ;;
  Linux)
    DEST_DIR="${XDG_CONFIG_HOME:-${HOME}/.config}/ghostty"
    if [[ ! -f "$LINUX_OVERRIDE" ]]; then
      echo "install-ghostty-config: missing $LINUX_OVERRIDE" >&2
      exit 1
    fi
    if [[ ! -f "$LINUX_HARNESS" ]]; then
      echo "install-ghostty-config: missing $LINUX_HARNESS" >&2
      exit 1
    fi
    bash -n "$LINUX_HARNESS"
    ;;
  *)
    echo "install-ghostty-config: unsupported OS: $OS" >&2
    exit 1
    ;;
esac

DEST="${DEST_DIR}/config"
MARKER="# Managed by install-ghostty-config.sh -- edit repo config sources, then re-run this script."

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

run mkdir -p "$DEST_DIR"

if [[ "$OS" == "Darwin" ]]; then
  if ! [[ -d "/Applications/Ghostty.app" ]]; then
    echo "install-ghostty-config: Ghostty.app not found in /Applications" >&2
    echo "Install: https://ghostty.org/download" >&2
    exit 1
  fi

  if [[ -e "$DEST" && ! -L "$DEST" ]]; then
    backup="${DEST}.bak.$(date +%Y%m%d%H%M%S)"
    echo "install-ghostty-config: backing up existing file to $backup"
    run mv "$DEST" "$backup"
  fi
  run ln -sf "$SRC" "$DEST"
  GHOSTTY_BIN="/Applications/Ghostty.app/Contents/MacOS/ghostty"
else
  if [[ -e "$DEST" && ! -L "$DEST" ]] && ! grep -qF "$MARKER" "$DEST" 2>/dev/null; then
    backup="${DEST}.bak.$(date +%Y%m%d%H%M%S)"
    echo "install-ghostty-config: backing up existing file to $backup"
    run mv "$DEST" "$backup"
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] generate $DEST from $SRC + $LINUX_OVERRIDE"
  else
    TMP="$(mktemp)"
    trap 'rm -f "$TMP"' EXIT

    # Escape sed replacement metacharacters. This keeps repo roots containing
    # backslashes, '&' or our chosen delimiter '#' from corrupting the config.
    ESCAPED_REPO_ROOT="$(printf '%s' "$REPO_ROOT" | sed -e 's/[\\&#]/\\&/g')"

    {
      echo "$MARKER"
      echo
      cat "$SRC"
      echo
      sed "s#__REPO_ROOT__#${ESCAPED_REPO_ROOT}#g" "$LINUX_OVERRIDE"
    } > "$TMP"

    mv "$TMP" "$DEST"
    trap - EXIT
  fi

  GHOSTTY_BIN="$(command -v ghostty || true)"
fi

if [[ -n "${GHOSTTY_BIN:-}" && -x "$GHOSTTY_BIN" ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] $GHOSTTY_BIN +validate-config"
  else
    if ! "$GHOSTTY_BIN" +validate-config 2>&1; then
      echo "install-ghostty-config: validate failed (check config syntax)" >&2
      exit 1
    fi
    echo "install-ghostty-config: config OK at $DEST"
  fi
else
  echo "install-ghostty-config: wrote $DEST; Ghostty binary not found for validation"
fi

if [[ "$OS" == "Linux" ]]; then
  echo "Linux harness policy: concurrent Ghostty windows use separate opsly-harness tmux sessions."
else
  echo "Reload in Ghostty: Cmd+Shift+, or quit (Cmd+Q) and reopen."
fi
