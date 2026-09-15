#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LABEL="com.opsly.background-scheduler"
PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="${ROOT}/runtime/logs"
INTERVAL="${OPSLY_BACKGROUND_SCHEDULER_INTERVAL_SECONDS:-600}"
MODE="${1:-}"

log(){ printf '[background-scheduler-launchd] %s\n' "$*"; }
fail(){ log "FAIL: $*"; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || fail "macOS/Darwin required"
mkdir -p "${HOME}/Library/LaunchAgents" "$LOG_DIR"

find_latest_go_live_evidence() {
  find "${ROOT}/runtime/evidence" -maxdepth 1 -type f -name 'mac-go-live-*.json' 2>/dev/null     | sort     | tail -n 1
}

validate_go_live_evidence() {
  local file
  file="$(find_latest_go_live_evidence)"
  [[ -n "$file" ]] || fail "no Mac GO LIVE evidence found under runtime/evidence"

  node - "$file" <<'NODE'
const fs=require('fs');
const file=process.argv[2];
const e=JSON.parse(fs.readFileSync(file,'utf8'));
const ok =
  ['completed','done','success'].includes(String(e.status || '').toLowerCase()) &&
  e.invariants?.governed_submit === true &&
  e.invariants?.task_session_teardown === true &&
  e.invariants?.healthy_idle_restored === true &&
  Number(e.pre_task_sessions) === 0 &&
  Number(e.post_task_sessions) === 0;
if (!ok) {
  console.error('GO LIVE evidence is not a passing physical-Mac result');
  process.exit(4);
}
console.log(file);
NODE
}

render_plist() {
  cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd '${ROOT}' &amp;&amp; export OPSLY_BACKGROUND_EXECUTION_ENABLED=true &amp;&amp; doppler run --project ops-intcloudsysops --config prd -- npm run opsly:background:dispatch:execute</string>
  </array>

  <key>StartInterval</key>
  <integer>${INTERVAL}</integer>

  <key>RunAtLoad</key>
  <false/>

  <key>StandardOutPath</key>
  <string>${LOG_DIR}/background-scheduler.out.log</string>

  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/background-scheduler.err.log</string>

  <key>ProcessType</key>
  <string>Background</string>

  <key>LowPriorityIO</key>
  <true/>

  <key>AbandonProcessGroup</key>
  <false/>
</dict>
</plist>
EOF
}

case "$MODE" in
  --dry-run)
    validate_go_live_evidence >/dev/null
    log "GO LIVE evidence: PASS"
    log "label=${LABEL}"
    log "interval_seconds=${INTERVAL}"
    log "plist=${PLIST}"
    log "command=doppler run --project ops-intcloudsysops --config prd -- npm run opsly:background:dispatch:execute"
    ;;
  --remove)
    launchctl bootout "gui/${UID}/${LABEL}" >/dev/null 2>&1 || true
    rm -f "$PLIST"
    log "removed ${LABEL}"
    ;;
  --enable)
    command -v doppler >/dev/null 2>&1 || fail "doppler CLI required"
    command -v npm >/dev/null 2>&1 || fail "npm required"
    [[ -f "${ROOT}/scripts/ops/background-scheduler-dispatch.mjs" ]] || fail "scheduler dispatcher missing"
    [[ -f "${ROOT}/scripts/ops/mac-go-live-e2e.sh" ]] || fail "Mac GO LIVE runtime not present"

    evidence="$(validate_go_live_evidence)"
    log "GO LIVE evidence accepted: ${evidence}"

    render_plist > "$PLIST"
    plutil -lint "$PLIST" >/dev/null

    launchctl bootout "gui/${UID}/${LABEL}" >/dev/null 2>&1 || true
    launchctl bootstrap "gui/${UID}" "$PLIST"
    launchctl enable "gui/${UID}/${LABEL}"

    log "enabled ${LABEL}"
    log "interval_seconds=${INTERVAL}"
    log "scheduler remains governed by ResourceProbe, cost policy, concurrency and task safety gates"
    ;;
  *)
    cat >&2 <<EOF
usage:
  $0 --dry-run   # require GO LIVE evidence, print intended install
  $0 --enable    # install/enable 10-minute governed scheduler
  $0 --remove    # unload and delete LaunchAgent
EOF
    exit 2
    ;;
esac
