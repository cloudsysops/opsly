#!/usr/bin/env bash
# Idempotent: wire D:\Content as media canon + D:\opsly-media compatibility aliases.
# Run on PC gamer (WSL as opsly) OR via: ssh smdqcia-pc 'bash -s' < this-script
set -euo pipefail

CONTENT="${OPSLY_CONTENT_ROOT:-/mnt/d/Content}"
ALIAS="${OPSLY_MEDIA_REMOTE_ROOT:-/mnt/d/opsly-media}"
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: ensure-pc-gamer-media-layout.sh [--dry-run]

  Creates D:\Content media tree (canon) and D:\opsly-media symlinks (compat).
  Safe to re-run. Does not delete media files.

Env:
  OPSLY_CONTENT_ROOT        default: /mnt/d/Content
  OPSLY_MEDIA_REMOTE_ROOT   default: /mnt/d/opsly-media
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "DRY: $*"
  else
    "$@"
  fi
}

if [[ ! -d /mnt/d ]]; then
  echo "ERROR: /mnt/d missing — run on PC gamer WSL with D: mounted" >&2
  exit 1
fi

echo "CONTENT=$CONTENT"
echo "ALIAS=$ALIAS"

run mkdir -p \
  "$CONTENT/Media/Camara/inbox" \
  "$CONTENT/Media/Camara/processed" \
  "$CONTENT/Media/OBS/horizontal" \
  "$CONTENT/Media/OBS/vertical" \
  "$CONTENT/Media/OpsAfterDark" \
  "$CONTENT/Media/Audio" \
  "$CONTENT/Media/Graficos" \
  "$CONTENT/Projects" \
  "$CONTENT/Renders/_review" \
  "$CONTENT/Resolve/Backups" \
  "$CONTENT/Resolve/Gallery" \
  "$CONTENT/Archive" \
  "$ALIAS"/{from-mac,to-mac,to-pc-gamer}

# Replace physical dirs with symlinks when empty / not already linked
link_or_keep() {
  local target="$1" linkpath="$2"
  if [[ -L "$linkpath" ]]; then
    run ln -sfn "$target" "$linkpath"
    return 0
  fi
  if [[ -d "$linkpath" ]]; then
    # Only replace if empty (no files)
    if find "$linkpath" -mindepth 1 -maxdepth 1 | read -r _; then
      echo "KEEP non-empty dir (manual migrate): $linkpath"
      return 0
    fi
    run rmdir "$linkpath" 2>/dev/null || true
  fi
  run ln -sfn "$target" "$linkpath"
}

link_or_keep "$CONTENT/Media/Camara/inbox" "$ALIAS/camera"
link_or_keep "$CONTENT/Renders" "$ALIAS/exports"
link_or_keep "$CONTENT/Projects" "$ALIAS/projects"
link_or_keep "$CONTENT/Media/Camara/inbox" "$ALIAS/inbox"

run ln -sfn "$ALIAS" "${HOME}/opsly-media"

if [[ "$DRY_RUN" -eq 0 ]]; then
  cat > "$CONTENT/README-OPSLY-MEDIA.txt" <<'TXT'
Opsly media layout (PC gamer) — CANON = D:\Content

  Media\Camara\inbox\<ingest_id>\VIDEO|PHOTO   ← action cam raw
  Media\OBS\                                   ← OBS recordings
  Media\OpsAfterDark\                          ← show assets
  Projects\                                    ← Premiere / NLE projects
  Resolve\                                     ← DaVinci Resolve
  Renders\                                     ← final exports
  Archive\                                     ← cold / agent scratch

Compatibility aliases (same files):
  D:\opsly-media\camera   → Media\Camara\inbox
  D:\opsly-media\exports  → Renders
  D:\opsly-media\projects → Projects
  ~/opsly-media (WSL)     → /mnt/d/opsly-media

Do NOT put raw video in the WSL VHD or in git.
TXT
fi

echo "=== verify ==="
ls -la "$ALIAS" | sed -n '1,20p'
echo "LAYOUT_OK"
