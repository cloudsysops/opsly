#!/usr/bin/env bash
# Sync + optional open Capacitor iOS project for Peskids (macOS + Xcode required).
# Usage:
#   ./scripts/peskids-cap-ios.sh           # cap sync ios
#   ./scripts/peskids-cap-ios.sh --open    # sync + Xcode
#   ./scripts/peskids-cap-ios.sh --dry-run
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/apps/peskids"
MODE="sync"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --open) MODE="open" ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,7p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

if [[ ! -d "$APP/ios" ]]; then
  echo "Missing $APP/ios — run: cd apps/peskids && npx cap add ios" >&2
  exit 1
fi

mkdir -p "$APP/capacitor-web"
if [[ ! -f "$APP/capacitor-web/index.html" ]]; then
  echo "Missing capacitor-web/index.html" >&2
  exit 1
fi

cd "$APP"
run npm exec -- capacitor sync ios

if [[ "$MODE" == "open" ]]; then
  run npm exec -- capacitor open ios
fi
