#!/usr/bin/env bash
set -euo pipefail

# Capacitor Android: env (Java 21 + Android SDK) + cap sync + Gradle assemble.
# Usage:
#   ./scripts/peskids-cap-android.sh
#   ./scripts/peskids-cap-android.sh --open
#   ./scripts/peskids-cap-android.sh --variant release
#   ./scripts/peskids-cap-android.sh --dry-run

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PESKIDS_DIR="${REPO_ROOT}/apps/peskids"
ANDROID_DIR="${PESKIDS_DIR}/android"
CAP_BIN="${REPO_ROOT}/node_modules/.bin/cap"

DRY_RUN=false
OPEN_STUDIO=false
SYNC_ONLY=false
GRADLE_TASK="assembleDebug"

usage() {
  cat <<'EOF'
Usage: scripts/peskids-cap-android.sh [options]

Builds the Peskids Capacitor Android project with the correct Java/SDK toolchain.

Options:
  --dry-run       Print commands without executing
  --open          Open the project in Android Studio after sync/build
  --sync-only     Run cap sync only (skip Gradle)
  --variant TYPE  Gradle variant: debug (default) or release
  -h, --help      Show this help

Environment (optional overrides):
  JAVA_HOME       JDK 21 recommended (Gradle fails on Java 26+)
  ANDROID_HOME    Android SDK root (Homebrew: .../share/android-commandlinetools)
  ANDROID_SDK_ROOT  Same as ANDROID_HOME if unset

Output (debug):
  apps/peskids/android/app/build/outputs/apk/debug/app-debug.apk
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --open) OPEN_STUDIO=true; shift ;;
    --sync-only) SYNC_ONLY=true; shift ;;
    --variant)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --variant (debug|release)" >&2
        exit 1
      fi
      case "$2" in
        debug) GRADLE_TASK="assembleDebug" ;;
        release) GRADLE_TASK="assembleRelease" ;;
        *)
          echo "Unknown variant: $2 (use debug or release)" >&2
          exit 1
          ;;
      esac
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

resolve_java_home() {
  if [[ -n "${JAVA_HOME:-}" ]] && [[ -x "${JAVA_HOME}/bin/java" ]]; then
    return 0
  fi
  local candidate
  for candidate in \
    /Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home \
    /Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home; do
    if [[ -x "${candidate}/bin/java" ]]; then
      export JAVA_HOME="${candidate}"
      return 0
    fi
  done
  echo "JAVA_HOME not set and JDK 21 not found under /Library/Java/JavaVirtualMachines." >&2
  echo "Install Temurin 21 or export JAVA_HOME before running this script." >&2
  exit 1
}

resolve_android_home() {
  if [[ -n "${ANDROID_HOME:-}" ]]; then
    export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
    return 0
  fi
  local candidate
  for candidate in \
    /opt/homebrew/share/android-commandlinetools \
    /usr/local/share/android-commandlinetools \
    "${HOME}/Library/Android/sdk"; do
    if [[ -d "${candidate}/platform-tools" ]] || [[ -d "${candidate}/cmdline-tools" ]]; then
      export ANDROID_HOME="${candidate}"
      export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
      return 0
    fi
  done
  echo "ANDROID_HOME not set and no SDK found (brew install android-commandlinetools)." >&2
  exit 1
}

ensure_cap_web_dir() {
  local out_index="${PESKIDS_DIR}/out/index.html"
  if [[ -f "${out_index}" ]]; then
    return 0
  fi
  echo "Creating minimal ${out_index} for cap sync (Capacitor webDir)..."
  run mkdir -p "${PESKIDS_DIR}/out"
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] write stub ${out_index}"
    return 0
  fi
  cat >"${out_index}" <<'HTML'
<!DOCTYPE html>
<html lang="es">
  <head><meta charset="utf-8"><title>Peskids</title></head>
  <body><p>Peskids shell — live URL loads from capacitor.config.ts</p></body>
</html>
HTML
}

main() {
  if [[ ! -d "${ANDROID_DIR}" ]]; then
    echo "Missing ${ANDROID_DIR}. Run cap add android in apps/peskids first." >&2
    exit 1
  fi
  if [[ ! -x "${CAP_BIN}" ]]; then
    echo "Missing ${CAP_BIN}. Run npm ci at repo root." >&2
    exit 1
  fi

  resolve_java_home
  resolve_android_home

  echo "JAVA_HOME=${JAVA_HOME}"
  echo "ANDROID_HOME=${ANDROID_HOME}"

  ensure_cap_web_dir

  echo "→ cap sync (apps/peskids)"
  run bash -c "cd '${PESKIDS_DIR}' && '${CAP_BIN}' sync"

  if [[ "$SYNC_ONLY" == true ]]; then
    echo "cap sync complete (--sync-only)."
    exit 0
  fi

  echo "→ Gradle ${GRADLE_TASK}"
  run bash -c "cd '${ANDROID_DIR}' && ./gradlew '${GRADLE_TASK}'"

  if [[ "$GRADLE_TASK" == "assembleDebug" ]]; then
    echo "APK: ${ANDROID_DIR}/app/build/outputs/apk/debug/app-debug.apk"
  else
    echo "Release APK/AAB under: ${ANDROID_DIR}/app/build/outputs/"
  fi

  if [[ "$OPEN_STUDIO" == true ]]; then
    local studio="/Applications/Android Studio.app"
    if [[ ! -d "${studio}" ]]; then
      echo "Android Studio not found at ${studio}" >&2
      exit 1
    fi
    echo "→ Opening Android Studio"
    run open -a "${studio}" "${ANDROID_DIR}"
  fi
}

main "$@"
