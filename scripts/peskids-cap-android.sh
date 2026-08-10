#!/usr/bin/env bash
# Sync + optional open/build Capacitor Android project for Peskids.
# Usage:
#   ./scripts/peskids-cap-android.sh           # cap sync android
#   ./scripts/peskids-cap-android.sh --open    # sync + Android Studio
#   ./scripts/peskids-cap-android.sh --build   # sync + assembleDebug
#   ./scripts/peskids-cap-android.sh --dry-run
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/apps/peskids"
MODE="sync"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --open) MODE="open" ;;
    --build) MODE="build" ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,8p' "$0"
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

if [[ ! -d "$APP/android" ]]; then
  echo "Missing $APP/android — run: cd apps/peskids && npx cap add android" >&2
  exit 1
fi

mkdir -p "$APP/capacitor-web"
if [[ ! -f "$APP/capacitor-web/index.html" ]]; then
  echo "Missing capacitor-web/index.html" >&2
  exit 1
fi

cd "$APP"
run npm exec -- capacitor sync android

case "$MODE" in
  open)
    run npm exec -- capacitor open android
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
