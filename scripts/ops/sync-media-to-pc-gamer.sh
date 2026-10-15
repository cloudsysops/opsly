#!/usr/bin/env bash
# Sync Opsly shared media from Mac hub -> PC gamer edit station over Tailscale SSH.
# Idempotent. Default: one-way Mac → PC (editors work on the PC copy).
set -euo pipefail

DRY_RUN=0
MEDIA_ROOT="${OPSLY_MEDIA_ROOT:-$HOME/opsly-media}"
SSH_HOST="${OPSLY_MEDIA_SSH_HOST:-smdqcia-pc}"
# WSL path on PC gamer (Windows editors can use \\wsl$\Ubuntu\home\opsly\opsly-media
# or a junction to D:\opsly-media — see runbook).
# Prefer Windows D: HDD via compat alias /mnt/d/opsly-media
# (camera/exports/projects → D:\Content\… — see OPSLY-SHARED-MEDIA.md).
REMOTE_ROOT="${OPSLY_MEDIA_REMOTE_ROOT:-/mnt/d/opsly-media}"
# What to push: latest camera ingest + exports by default
SRC_REL="${OPSLY_MEDIA_SRC_REL:-to-pc-gamer/latest-camera}"

usage() {
  cat <<'EOF'
Usage: sync-media-to-pc-gamer.sh [--dry-run] [--all] [--src REL]

  --dry-run   Show rsync plan only
  --all       Sync camera/ + exports/ + to-pc-gamer/ (not entire projects/)
  --src REL   Relative path under MEDIA_ROOT (default: to-pc-gamer/latest-camera)

Env:
  OPSLY_MEDIA_ROOT          default: ~/opsly-media
  OPSLY_MEDIA_SSH_HOST      default: smdqcia-pc
  OPSLY_MEDIA_REMOTE_ROOT   default: /mnt/d/opsly-media  (= alias → D:\Content)
EOF
}

SYNC_ALL=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --all) SYNC_ALL=1; shift ;;
    --src) SRC_REL="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ ! -d "$MEDIA_ROOT" ]]; then
  echo "ERROR: MEDIA_ROOT missing: $MEDIA_ROOT" >&2
  echo "Create layout / ingest first (see docs/runbooks/OPSLY-SHARED-MEDIA.md)" >&2
  exit 1
fi

# macOS ships openrsync/old rsync — avoid GNU-only --info= flags
RSYNC_FLAGS=(-az --human-readable --progress --partial --stats)
if [[ "$DRY_RUN" -eq 1 ]]; then
  RSYNC_FLAGS+=(--dry-run -n)
fi

remote_prep() {
  # Ensure Content canon + opsly-media aliases exist on PC before rsync
  local ensure_script
  ensure_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ensure-pc-gamer-media-layout.sh"
  if [[ -f "$ensure_script" ]]; then
    ssh -o BatchMode=yes -o ConnectTimeout=20 "$SSH_HOST" \
      'bash --noprofile --norc -s' <"$ensure_script"
  else
    ssh -o BatchMode=yes -o ConnectTimeout=20 "$SSH_HOST" \
      "bash --noprofile --norc -lc 'mkdir -p \"$REMOTE_ROOT\"/{from-mac,to-mac,to-pc-gamer} /mnt/d/Content/Media/Camara/inbox'"
  fi
}

sync_one() {
  local rel="$1"
  local src="$MEDIA_ROOT/$rel"
  if [[ ! -e "$src" ]]; then
    echo "SKIP missing: $src"
    return 0
  fi
  # Resolve symlink so rsync copies real camera folder content
  if [[ -L "$src" ]]; then
    src="$(cd "$src" && pwd -P)"
    rel="camera/$(basename "$src")"
  fi
  local dest="${SSH_HOST}:${REMOTE_ROOT}/${rel}/"
  echo "→ rsync $src/  =>  $dest"
  # shellcheck disable=SC2029
  rsync "${RSYNC_FLAGS[@]}" -e "ssh -o BatchMode=yes -o ConnectTimeout=20" \
    "$src/" "$dest"
}

echo "MEDIA_ROOT=$MEDIA_ROOT"
echo "SSH_HOST=$SSH_HOST"
echo "REMOTE_ROOT=$REMOTE_ROOT"
echo "DRY_RUN=$DRY_RUN"

remote_prep

if [[ "$SYNC_ALL" -eq 1 ]]; then
  sync_one "camera"
  sync_one "exports"
  sync_one "to-pc-gamer"
else
  sync_one "$SRC_REL"
fi

echo "DONE. On PC (WSL): ls $REMOTE_ROOT"
echo "Windows Explorer: \\\\wsl\$\\Ubuntu\\home\\opsly\\opsly-media"
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "(dry-run only — re-run without --dry-run to copy)"
fi
