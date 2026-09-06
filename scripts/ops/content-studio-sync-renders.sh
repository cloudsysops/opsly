#!/usr/bin/env bash
# Pull Content Studio renders from PC-gamer WSL → this Mac (kits / approval).
# Does not upload to YouTube. Does not print secrets.
#
# Usage:
#   ./scripts/ops/content-studio-sync-renders.sh --dry-run
#   ./scripts/ops/content-studio-sync-renders.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DRY_RUN=0
SSH_HOST="${PC_GAMER_SSH_HOST:-pc-gamer}"
REMOTE_ROOT="${PC_GAMER_OPSLY_ROOT:-/home/devops/opsly}"
LOCAL_DIR="$ROOT/runtime/content-studio"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$LOCAL_DIR/renders" "$LOCAL_DIR/youtube-upload-kit"

echo "[sync] $SSH_HOST:$REMOTE_ROOT/runtime/content-studio → $LOCAL_DIR"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[dry-run] ssh $SSH_HOST wsl tar renders + youtube-upload-kit"
  exit 0
fi

if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "$SSH_HOST" "echo ok" >/dev/null 2>&1; then
  echo "[sync] ERROR: SSH $SSH_HOST unreachable" >&2
  exit 2
fi

ssh -o BatchMode=yes -o ConnectTimeout=25 "$SSH_HOST" \
  wsl -d Ubuntu -u devops -- tar -C "$REMOTE_ROOT/runtime/content-studio" -cf - \
  renders youtube-upload-kit 2>/dev/null \
  | tar -C "$LOCAL_DIR" -xf -

echo "[sync] done → $LOCAL_DIR"
