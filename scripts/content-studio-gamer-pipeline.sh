#!/usr/bin/env bash
# Content Studio channel pipeline: check PC-gamer → MoneyPrinter bridge → enqueue.
# Primary commercial channel: bitsitos (tech for kids). splashitos = secondary.
#
# Usage:
#   ./scripts/content-studio-gamer-pipeline.sh --channel bitsitos --dry-run
#   MONEY_PRINTER_TURBO_URL=http://100.74.88.103:8080 REDIS_URL=… \
#     ./scripts/content-studio-gamer-pipeline.sh --channel bitsitos
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CHANNEL="bitsitos"
DRY_RUN=0
SKIP_ONLINE=0
START_BRIDGE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel)
      CHANNEL="${2:-bitsitos}"
      shift 2
      ;;
    --dry-run) DRY_RUN=1; shift ;;
    --skip-online-check) SKIP_ONLINE=1; shift ;;
    --start-bridge-local) START_BRIDGE=1; shift ;;
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

GAMER_TS_IP="${PC_GAMER_TAILSCALE_IP:-100.74.88.103}"
MPT_URL="${MONEY_PRINTER_TURBO_URL:-http://${GAMER_TS_IP}:8080}"
TAG="[$CHANNEL]"

echo "$TAG MoneyPrinter URL: $MPT_URL"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[dry-run] Would:"
  echo "  1) ./scripts/ops/check-pc-gamer-online.sh --json"
  echo "  2) curl $MPT_URL/health"
  echo "  3) enqueue --channel $CHANNEL"
  ./scripts/content-studio-enqueue.sh --channel "$CHANNEL" --dry-run
  exit 0
fi

if [[ "$SKIP_ONLINE" -eq 0 && -x ./scripts/ops/check-pc-gamer-online.sh ]]; then
  echo "$TAG Checking PC-gamer Tailscale…"
  ./scripts/ops/check-pc-gamer-online.sh --json || true
fi

if [[ "$START_BRIDGE" -eq 1 ]]; then
  echo "$TAG Starting local moneyprinter-bridge on :8080…"
  mkdir -p runtime/content-studio/renders
  if ! curl -sf --max-time 2 "http://127.0.0.1:8080/health" >/dev/null 2>&1; then
    nohup node scripts/moneyprinter-bridge.mjs >runtime/content-studio/moneyprinter-bridge.log 2>&1 &
    echo $! >runtime/content-studio/moneyprinter-bridge.pid
    sleep 1
  fi
  MPT_URL="http://127.0.0.1:8080"
fi

if ! curl -sf --max-time 5 "${MPT_URL%/}/health" >/dev/null; then
  echo "$TAG ERROR: MoneyPrinter bridge not reachable at $MPT_URL" >&2
  echo "  On PC-gamer WSL: ./scripts/ops/pc-gamer-docker-plane.sh --up --with-content" >&2
  exit 1
fi

echo "$TAG Bridge health OK"

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "$TAG ERROR: REDIS_URL required" >&2
  exit 1
fi

export MONEY_PRINTER_TURBO_URL="$MPT_URL"
./scripts/content-studio-enqueue.sh --channel "$CHANNEL"

echo "$TAG Enqueued. Gamer allowlist must include content-video."
echo "Next: ./scripts/content-studio-publish-youtube.sh --channel $CHANNEL --dry-run"
