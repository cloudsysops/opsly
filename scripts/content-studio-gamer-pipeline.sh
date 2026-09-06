#!/usr/bin/env bash
# Content Studio channel pipeline: require PC-gamer → enqueue worker-local render.
# Mac never starts MoneyPrinter unless --allow-mac-render (emergency).
# Primary commercial channel: bitsitos (tech for kids). splashitos = secondary.
#
# Usage:
#   ./scripts/content-studio-gamer-pipeline.sh --channel bitsitos --dry-run
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/content-studio-gamer-pipeline.sh --channel bitsitos
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
source "$ROOT/scripts/ops/content-studio-gamer-env.sh"

CHANNEL="bitsitos"
DRY_RUN=0
SKIP_ONLINE=0
ALLOW_MAC=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel)
      CHANNEL="${2:-bitsitos}"
      shift 2
      ;;
    --dry-run) DRY_RUN=1; shift ;;
    --skip-online-check) SKIP_ONLINE=1; shift ;;
    --allow-mac-render) ALLOW_MAC=1; shift ;;
    --start-bridge-local)
      echo "ERROR: --start-bridge-local retired. Content Studio renders on PC-gamer." >&2
      echo "  Emergency only: --allow-mac-render" >&2
      exit 1
      ;;
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

export CONTENT_STUDIO_CHANNEL="$CHANNEL"
# Re-source so tenant slug picks up the channel
# shellcheck disable=SC1091
source "$ROOT/scripts/ops/content-studio-gamer-env.sh"

TAG="[$CHANNEL]"
echo "$TAG render host=pc-gamer MoneyPrinter=${MONEY_PRINTER_TURBO_URL}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[dry-run] Would:"
  echo "  1) ./scripts/ops/check-pc-gamer-online.sh --json"
  echo "  2) enqueue --channel $CHANNEL (mpt=${MONEY_PRINTER_TURBO_URL})"
  echo "  3) skip Mac moneyprinter-bridge"
  ./scripts/content-studio-enqueue.sh --channel "$CHANNEL" --dry-run
  exit 0
fi

if [[ "$ALLOW_MAC" -eq 1 ]]; then
  echo "$TAG WARNING: emergency Mac render (--allow-mac-render)" >&2
  mkdir -p runtime/content-studio/renders
  if ! curl -sf --max-time 2 "http://127.0.0.1:8080/health" >/dev/null 2>&1; then
    nohup node scripts/moneyprinter-bridge.mjs >runtime/content-studio/moneyprinter-bridge.log 2>&1 &
    echo $! >runtime/content-studio/moneyprinter-bridge.pid
    sleep 1
  fi
elif [[ "$SKIP_ONLINE" -eq 0 ]]; then
  echo "$TAG Checking PC-gamer (SSH o worker health; heartbeat solo no cuenta)…"
  if ! content_studio_gamer_ready; then
    echo "$TAG ERROR: PC-gamer no alcanzable (SSH/health down). Encenderlo + Tailscale/WSL, luego:" >&2
    echo "  ./scripts/ops/pc-gamer-reconnect.sh --use-host-ollama --with-content" >&2
    echo "  npm run content:factory:gamer" >&2
    exit 2
  fi
fi

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "$TAG ERROR: REDIS_URL required" >&2
  exit 1
fi

./scripts/content-studio-enqueue.sh --channel "$CHANNEL"

echo "$TAG Enqueued. Worker on gamer must include content-video + localhost:8080."
echo "After jobs finish: ./scripts/ops/content-studio-sync-renders.sh"
echo "Next: ./scripts/content-studio-publish-youtube.sh --channel $CHANNEL --dry-run"
