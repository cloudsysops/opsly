#!/usr/bin/env bash
# Content Factory bootstrap — Mac primary + optional PC-gamer GPU.
# Does NOT deploy VPS. Does NOT use Peskids branding.
#
# Usage:
#   ./scripts/content-factory-bootstrap.sh --dry-run
#   ./scripts/content-factory-bootstrap.sh --mac-bridge
#   ./scripts/content-factory-bootstrap.sh --mac-bridge --rebuild-kits
#   ./scripts/content-factory-bootstrap.sh --gamer-up   # needs Tailscale + SSH
#   ./scripts/content-factory-bootstrap.sh --watch-oauth
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DRY_RUN=0
MAC_BRIDGE=0
REBUILD_KITS=0
GAMER_UP=0
WATCH_OAUTH=0
GEN_ASSETS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --mac-bridge) MAC_BRIDGE=1; shift ;;
    --rebuild-kits) REBUILD_KITS=1; shift ;;
    --gamer-up) GAMER_UP=1; shift ;;
    --watch-oauth) WATCH_OAUTH=1; shift ;;
    --gen-assets) GEN_ASSETS=1; shift ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

echo "[content-factory] root=$ROOT"
echo "[content-factory] capacity: VPS alert active → no heavy VPS deploy; render on Mac/gamer"

if [[ "$GEN_ASSETS" -eq 1 || "$MAC_BRIDGE" -eq 1 ]]; then
  run mkdir -p runtime/content-studio/brand-assets
  if [[ "$DRY_RUN" -eq 0 ]]; then
    if ! command -v magick >/dev/null 2>&1; then
      echo "[content-factory] magick not installed → skip brand assets (install ImageMagick or reuse runtime/content-studio/brand-assets/)" >&2
    else
    magick -size 800x800 "gradient:#1D4ED8-#7C3AED" \
      -gravity center -fill white -pointsize 96 -annotate +0+0 'BITSITOS' \
      runtime/content-studio/brand-assets/bitsitos-avatar.png
    magick -size 2560x1440 "gradient:#0F172A-#1D4ED8" \
      -gravity center -fill white -pointsize 120 -annotate +0-40 'BITSITOS' \
      -pointsize 48 -annotate +0+80 'Tech + Edu + Entretenimiento para familias' \
      runtime/content-studio/brand-assets/bitsitos-banner.png
    magick -size 800x800 "gradient:#0E7490-#0F766E" \
      -gravity center -fill white -pointsize 84 -annotate +0+0 'SPLASHITOS' \
      runtime/content-studio/brand-assets/splashitos-avatar.png
    magick -size 2560x1440 "gradient:#155E75-#0891B2" \
      -gravity center -fill white -pointsize 110 -annotate +0-40 'SPLASHITOS' \
      -pointsize 48 -annotate +0+80 'Natación + deporte kids' \
      runtime/content-studio/brand-assets/splashitos-banner.png
    echo "[content-factory] brand assets → runtime/content-studio/brand-assets/"
    fi
  fi
fi

if [[ "$MAC_BRIDGE" -eq 1 ]]; then
  run mkdir -p runtime/content-studio/renders
  if [[ "$DRY_RUN" -eq 0 ]]; then
    if ! curl -sf --max-time 2 http://127.0.0.1:8080/health >/dev/null 2>&1; then
      nohup node scripts/moneyprinter-bridge.mjs >runtime/content-studio/moneyprinter-bridge.log 2>&1 &
      echo $! >runtime/content-studio/moneyprinter-bridge.pid
      sleep 1
    fi
    curl -sf --max-time 3 http://127.0.0.1:8080/health
    echo
  else
    echo "[dry-run] start moneyprinter-bridge :8080"
  fi
fi

if [[ "$REBUILD_KITS" -eq 1 ]]; then
  run ./scripts/content-studio-publish-youtube.sh --channel bitsitos --kit
  run ./scripts/content-studio-publish-youtube.sh --channel splashitos --kit
fi

if [[ "$GAMER_UP" -eq 1 ]]; then
  echo "[content-factory] Checking PC-gamer…"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] ./scripts/ops/check-pc-gamer-online.sh --json"
    echo "[dry-run] ssh → ./scripts/ops/pc-gamer-docker-plane.sh --up --with-content"
    exit 0
  fi
  if ! ./scripts/ops/check-pc-gamer-online.sh --json | grep -q '"ssh":true'; then
    echo "[content-factory] PC-gamer OFFLINE. Enciéndelo + Tailscale, luego reintenta --gamer-up" >&2
    echo "  Doc: docs/04-infrastructure/PC-GAMER-WORKER.md" >&2
    exit 2
  fi
  # Host alias from check script / ssh config
  GAMER_HOST="${PC_GAMER_SSH_HOST:-pc-gamer}"
  ssh -o BatchMode=yes -o ConnectTimeout=20 "$GAMER_HOST" \
    "cd ~/opsly && git pull --ff-only && ./scripts/ops/pc-gamer-docker-plane.sh --up --with-content" || {
      echo "[content-factory] SSH/plane failed. Manual on WSL:" >&2
      echo "  cd ~/opsly && ./scripts/ops/pc-gamer-docker-plane.sh --up --with-content" >&2
      exit 3
    }
fi

if [[ "$WATCH_OAUTH" -eq 1 ]]; then
  TARGET="${HOME}/Downloads/youtube-oauth-client.json"
  echo "[content-factory] Watching for $TARGET (Ctrl+C to stop)"
  echo "  Setup: docs/brand/icso/OPSLYQUANTUM-YOUTUBE-SETUP.md"
  for _ in $(seq 1 120); do
    if [[ -f "$TARGET" ]]; then
      echo "[content-factory] FOUND oauth client → running Doppler setup"
      if [[ "$DRY_RUN" -eq 1 ]]; then
        echo "[dry-run] ./scripts/youtube-oauth-doppler-setup.sh --client-json $TARGET"
        exit 0
      fi
      ./scripts/youtube-oauth-doppler-setup.sh --client-json "$TARGET"
      exit $?
    fi
    sleep 5
  done
  echo "[content-factory] Timeout waiting for oauth JSON" >&2
  exit 4
fi

echo "[content-factory] done"
