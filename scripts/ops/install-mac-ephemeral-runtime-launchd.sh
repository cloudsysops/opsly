#!/usr/bin/env bash
# Install canonical Opsly Mac launchd services.
# Persistent services: local-agents worker, prompt watcher, authenticated bridges.
# A lightweight seed timer copies trusted tracked tasks into the local queue.
# AI CLIs remain ephemeral per AgentTask inside tmux.
set -euo pipefail

DRY_RUN=0
UNLOAD=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --unload) UNLOAD=1 ;;
    -h|--help)
      sed -n '2,7p' "$0"
      exit 0
      ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST="${HOME}/Library/LaunchAgents"
LOG_DIR="${HOME}/Library/Logs/opsly"
UID_VALUE="$(id -u)"

command -v launchctl >/dev/null 2>&1 || { echo "launchctl is required (macOS)" >&2; exit 2; }
DOPPLER_BIN="$(command -v doppler || true)"
NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"

if [[ "$UNLOAD" != "1" ]]; then
  [[ -n "$DOPPLER_BIN" ]] || { echo "doppler CLI not found" >&2; exit 2; }
  [[ -n "$NODE_BIN" ]] || { echo "node not found" >&2; exit 2; }
  [[ -n "$NPM_BIN" ]] || { echo "npm not found" >&2; exit 2; }
fi

mkdir -p "$DEST" "$LOG_DIR"

labels=(
  com.opsly.orchestrator-mac
  com.opsly.local-agents-worker
  com.opsly.prompt-watcher
  com.opsly.prompt-seed
  com.opsly.bridge.opencode
  com.opsly.bridge.claude
  com.opsly.bridge.codex
  com.opsly.bridge.hermes
)

bootout() {
  launchctl bootout "gui/${UID_VALUE}/$1" 2>/dev/null || true
}

if [[ "$UNLOAD" == "1" ]]; then
  for label in "${labels[@]}"; do bootout "$label"; done
  echo "[launchd] canonical Opsly Mac services unloaded"
  exit 0
fi

PATH_VALUE="$(dirname "$NODE_BIN"):$(dirname "$NPM_BIN"):$(dirname "$DOPPLER_BIN"):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

write_plist() {
  local label="$1"
  local mode="$2"
  local command="$3"
  local interval="${4:-}"
  local secret_mode="${5:-doppler}"

  local path="$DEST/$label.plist"
  {
    cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array>
EOF
    if [[ "$secret_mode" == "raw" ]]; then
      cat <<EOF
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd '$ROOT' &amp;&amp; $command</string>
EOF
    else
      cat <<EOF
    <string>$DOPPLER_BIN</string>
    <string>run</string>
    <string>--project</string><string>ops-intcloudsysops</string>
    <string>--config</string><string>prd</string>
    <string>--</string>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd '$ROOT' &amp;&amp; $command</string>
EOF
    fi
    cat <<EOF
  </array>
  <key>WorkingDirectory</key><string>$ROOT</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>$PATH_VALUE</string></dict>
EOF
    if [[ "$mode" == "keepalive" ]]; then
      cat <<EOF
  <key>KeepAlive</key><true/>
  <key>RunAtLoad</key><true/>
EOF
    else
      cat <<EOF
  <key>StartInterval</key><integer>$interval</integer>
  <key>RunAtLoad</key><true/>
EOF
    fi
    cat <<EOF
  <key>StandardOutPath</key><string>$LOG_DIR/$label.out</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/$label.err</string>
</dict>
</plist>
EOF
  } >"$path.tmp"
  mv "$path.tmp" "$path"
}

write_plist com.opsly.orchestrator-mac keepalive "./scripts/ops/start-orchestrator-mac.sh" "" raw
write_plist com.opsly.local-agents-worker keepalive "./scripts/ops/start-mac-local-agents-worker.sh"
write_plist com.opsly.prompt-watcher keepalive "npm run opsly:local-prompt-watcher"
write_plist com.opsly.prompt-seed interval "./scripts/ops/dispatch-prompt-queue.sh --seed-only" 600
write_plist com.opsly.bridge.opencode keepalive "npm run opsly:local-opencode-service"
write_plist com.opsly.bridge.claude keepalive "npm run opsly:local-claude-service"
write_plist com.opsly.bridge.codex keepalive "npm run opsly:local-codex-service"
write_plist com.opsly.bridge.hermes keepalive "npm run opsly:local-hermes-service"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "[launchd] DRY-RUN generated plists in $DEST"
  for label in "${labels[@]}"; do echo "  $label"; done
  exit 0
fi

for label in "${labels[@]}"; do
  bootout "$label"
  launchctl bootstrap "gui/${UID_VALUE}" "$DEST/$label.plist"
done

echo "[launchd] canonical Opsly Mac runtime installed"
echo "[launchd] AI bridges are infrastructure only; agent CLIs execute per-task in ephemeral tmux."
