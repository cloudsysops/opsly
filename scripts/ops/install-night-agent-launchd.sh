#!/usr/bin/env bash
# Install user LaunchAgents that poll the night window and the prompt queue.
# Writes only under ~/Library/LaunchAgents (not VPS, not infra/ on disk until loaded).
# Usage: ./scripts/ops/install-night-agent-launchd.sh [--dry-run] [--unload]
set -euo pipefail

DRY_RUN=0
UNLOAD=0
for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=1 ;;
    --unload) UNLOAD=1 ;;
    -h|--help)
      sed -n '2,5p' "$0"
      exit 0
      ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST="${HOME}/Library/LaunchAgents"
LOG_DIR="${HOME}/Library/Logs/opsly"
DOPPLER_BIN="$(command -v doppler || true)"
WAVE_LABEL="com.opsly.night-merge-wave1"
QUEUE_LABEL="com.opsly.prompt-queue-opencode"

mkdir -p "${DEST}" "${LOG_DIR}"

unload_one() {
  local label="$1"
  launchctl bootout "gui/$(id -u)/${label}" 2>/dev/null || true
}

if [[ "${UNLOAD}" == "1" ]]; then
  unload_one "${WAVE_LABEL}"
  unload_one "${QUEUE_LABEL}"
  log() { printf '[launchd] %s\n' "$*"; }
  log "unloaded ${WAVE_LABEL} ${QUEUE_LABEL}"
  exit 0
fi

if [[ -z "${DOPPLER_BIN}" ]]; then
  echo "doppler CLI not in PATH" >&2
  exit 1
fi

write_plist() {
  local label="$1"
  local script="$2"
  local path="${DEST}/${label}.plist"
  cat >"${path}.tmp" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${DOPPLER_BIN}</string>
    <string>run</string>
    <string>--project</string>
    <string>ops-intcloudsysops</string>
    <string>--config</string>
    <string>prd</string>
    <string>--</string>
    <string>${script}</string>
  </array>
  <key>StartInterval</key>
  <integer>600</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${HOME}/.nvm/versions/node/v22.22.3/bin</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/${label}.out</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/${label}.err</string>
</dict>
</plist>
EOF
  mv "${path}.tmp" "${path}"
  printf '%s\n' "${path}"
}

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "DRY_RUN would write ${DEST}/${WAVE_LABEL}.plist and ${DEST}/${QUEUE_LABEL}.plist"
  echo "ROOT=${ROOT}"
  exit 0
fi

write_plist "${WAVE_LABEL}" "${ROOT}/scripts/ops/night-merge-wave1.sh"
write_plist "${QUEUE_LABEL}" "${ROOT}/scripts/ops/dispatch-prompt-queue.sh"
unload_one "${WAVE_LABEL}"
unload_one "${QUEUE_LABEL}"
launchctl bootstrap "gui/$(id -u)" "${DEST}/${WAVE_LABEL}.plist"
launchctl bootstrap "gui/$(id -u)" "${DEST}/${QUEUE_LABEL}.plist"
echo "loaded ${WAVE_LABEL} and ${QUEUE_LABEL} (every 10 min; scripts no-op by day)"
