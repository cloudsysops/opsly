#!/usr/bin/env bash
# sync-skills-external.sh — Exporta skills para agentes externos/internos.
# Uso:
#   ./scripts/sync-skills-external.sh [--target /mnt/skills] [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TARGET_ROOT="/mnt/skills"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET_ROOT="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown arg: $1" >&2
      echo "Usage: $0 [--target /mnt/skills] [--dry-run]" >&2
      exit 1
      ;;
  esac
done

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

SRC_USER="$REPO_ROOT/skills/user"
SRC_INDEX="$REPO_ROOT/skills/index.json"
SRC_README="$REPO_ROOT/skills/README.md"
DEST_USER="$TARGET_ROOT/user"
DEST_INDEX="$TARGET_ROOT/index.json"
DEST_README="$TARGET_ROOT/README.md"

if [[ ! -d "$SRC_USER" || ! -f "$SRC_INDEX" ]]; then
  echo "Skills source not found under $REPO_ROOT/skills" >&2
  exit 1
fi

log "Source: $SRC_USER"
log "Target: $TARGET_ROOT"

if $DRY_RUN; then
  log "DRY-RUN: crearía $DEST_USER"
  log "DRY-RUN: sincronizaría skills/user/* -> $DEST_USER"
  log "DRY-RUN: copiaría index.json y README.md"
  exit 0
fi

mkdir -p "$DEST_USER"

# Copia atómica simple por carpeta para compatibilidad amplia.
rm -rf "$DEST_USER"
mkdir -p "$DEST_USER"
cp -R "$SRC_USER"/. "$DEST_USER"/
cp "$SRC_INDEX" "$DEST_INDEX"
cp "$SRC_README" "$DEST_README"

log "Skills exportadas correctamente."
log "Validación rápida:"
log " - $(ls -1 "$DEST_USER" | wc -l | tr -d ' ') módulos en $DEST_USER"
log " - índice: $DEST_INDEX"
