#!/usr/bin/env bash
# Shared Capacitor mobile helper (Android + iOS) for tenant apps in the Opsly monorepo.
#
# Usage:
#   ./scripts/cap-mobile.sh <app> <platform> [--open] [--build] [--dry-run]
#
#   <app>      app directory name under apps/ (e.g. peskids, icso)
#   <platform> ios | android
#   --open     open the native project after sync (Xcode / Android Studio)
#   --build    (android only) run gradle assembleDebug after sync
#   --dry-run  print commands without executing
#
# Notes:
#   - App must already have capacitor-web/index.html and the native platform dir
#     (default.cap.config.ts or capacitor.config.ts). Generate with `npx cap add`.
#   - Requires the app to declare @capacitor/* deps in its own package.json.
#
# See: docs/tenants/<app>/MOBILE-APP.md
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

APP_NAME="${1:-}"
PLATFORM="${2:-}"
MODE="sync"
DRY_RUN=0
shift 2 || true

for arg in "$@"; do
  case "$arg" in
    --open) MODE="open" ;;
    --build) MODE="build" ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,17p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$APP_NAME" || -z "$PLATFORM" ]]; then
  echo "Usage: $0 <app> <platform> [--open] [--build] [--dry-run]" >&2
  echo "  Platform must be one of: ios | android" >&2
  exit 1
fi

case "$PLATFORM" in
  ios|android) ;;
  *)
    echo "Invalid platform '$PLATFORM' — expected ios | android" >&2
    exit 1
    ;;
esac

if [[ "$MODE" == "build" && "$PLATFORM" != "android" ]]; then
  echo "--build only applies to android" >&2
  exit 1
fi

APP="$ROOT/apps/$APP_NAME"

if [[ ! -d "$APP" ]]; then
  echo "Missing app dir: $APP" >&2
  exit 1
fi

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

if [[ ! -d "$APP/$PLATFORM" ]]; then
  echo "Missing $APP/$PLATFORM — run: cd apps/$APP_NAME && npx cap add $PLATFORM" >&2
  exit 1
fi

mkdir -p "$APP/capacitor-web"
if [[ ! -f "$APP/capacitor-web/index.html" ]]; then
  echo "Missing capacitor-web/index.html" >&2
  exit 1
fi

cd "$APP"
run npm exec -- capacitor sync "$PLATFORM"

case "$MODE" in
  open)
    run npm exec -- capacitor open "$PLATFORM"
    ;;
  build)
    if [[ ! -x "$APP/android/gradlew" ]]; then
      echo "gradlew missing under android/" >&2
      exit 1
    fi
    (cd "$APP/android" && run ./gradlew assembleDebug)
    echo "APK: $APP/android/app/build/outputs/apk/debug/"
    ;;
esac