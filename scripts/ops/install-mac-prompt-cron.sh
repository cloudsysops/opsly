#!/usr/bin/env bash
# Install Mac crontab (+ optional LaunchAgents) for pull + prompt-queue validation.
# Usage:
#   ./scripts/ops/install-mac-prompt-cron.sh [--dry-run] [--unload] [--launchd-also]
set -euo pipefail

DRY_RUN=0
UNLOAD=0
LAUNCHD=0
for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=1 ;;
    --unload) UNLOAD=1 ;;
    --launchd-also) LAUNCHD=1 ;;
    -h|--help)
      sed -n '2,6p' "$0"
      exit 0
      ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROOT="${REPO_ROOT:-${ROOT}}"
TICK="${ROOT}/scripts/ops/mac-prompt-cron-tick.sh"
PULL_ONLY="${ROOT}/scripts/ops/mac-runner-pull.sh"
VALIDATE_ONLY="${ROOT}/scripts/ops/validate-prompt-queue.sh"
LOG_DIR="${HOME}/Library/Logs/opsly"
MARKER_PULL="opsly-mac-runner-pull"
MARKER_VALIDATE="opsly-prompt-queue-validate"
MARKER_TICK="opsly-mac-prompt-cron-tick"

mkdir -p "${LOG_DIR}" "${ROOT}/runtime/logs"

chmod +x "${TICK}" "${PULL_ONLY}" "${VALIDATE_ONLY}" 2>/dev/null || true

# Every 5 min: ff-only pull on trusted branch (main)
CRON_PULL="*/5 * * * * REPO_ROOT=${ROOT} PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${HOME}/.nvm/versions/node/v22.22.3/bin ${PULL_ONLY} >> ${LOG_DIR}/${MARKER_PULL}.log 2>&1"
# Every 10 min: validate night-queue + .cursor/prompts/queue frontmatter
CRON_VALIDATE="*/10 * * * * REPO_ROOT=${ROOT} PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${HOME}/.nvm/versions/node/v22.22.3/bin ${VALIDATE_ONLY} >> ${LOG_DIR}/${MARKER_VALIDATE}.log 2>&1"

strip_markers() {
  crontab -l 2>/dev/null | grep -v "${MARKER_PULL}" | grep -v "${MARKER_VALIDATE}" | grep -v "${MARKER_TICK}" || true
}

if [[ "${UNLOAD}" == "1" ]]; then
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "DRY_RUN would remove crontab lines matching ${MARKER_PULL}|${MARKER_VALIDATE}|${MARKER_TICK}"
  else
    strip_markers | crontab -
    echo "removed opsly prompt/pull cron lines"
  fi
  if [[ "${LAUNCHD}" == "1" ]]; then
    launchctl bootout "gui/$(id -u)/com.opsly.mac-runner-pull" 2>/dev/null || true
    launchctl bootout "gui/$(id -u)/com.opsly.prompt-queue-validate" 2>/dev/null || true
    echo "unloaded LaunchAgents (if present)"
  fi
  exit 0
fi

if [[ ! -x "${PULL_ONLY}" || ! -x "${VALIDATE_ONLY}" ]]; then
  echo "error: scripts not executable under ${ROOT}/scripts/ops/" >&2
  exit 1
fi

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "DRY_RUN would install crontab:"
  echo "  ${CRON_PULL}"
  echo "  ${CRON_VALIDATE}"
  exit 0
fi

{
  strip_markers
  echo "${CRON_PULL}"
  echo "${CRON_VALIDATE}"
} | crontab -

echo "installed crontab:"
crontab -l | grep -E "${MARKER_PULL}|${MARKER_VALIDATE}" || true

if [[ "${LAUNCHD}" == "1" ]]; then
  DEST="${HOME}/Library/LaunchAgents"
  mkdir -p "${DEST}"
  write_plist() {
    local label="$1"
    local script="$2"
    local interval="$3"
    local path="${DEST}/${label}.plist"
    cat >"${path}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${script}</string>
  </array>
  <key>StartInterval</key>
  <integer>${interval}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${HOME}/.nvm/versions/node/v22.22.3/bin</string>
    <key>REPO_ROOT</key>
    <string>${ROOT}</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/${label}.out</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/${label}.err</string>
</dict>
</plist>
EOF
    launchctl bootout "gui/$(id -u)/${label}" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "${path}"
    echo "loaded ${label} (every ${interval}s)"
  }
  write_plist "com.opsly.mac-runner-pull" "${PULL_ONLY}" 300
  write_plist "com.opsly.prompt-queue-validate" "${VALIDATE_ONLY}" 600
fi
