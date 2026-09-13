#!/usr/bin/env bash
# Canonical readiness doctor for the Mac ephemeral execution node (#1222).
#
# Output contract:
#   READY:     "OPSLY MAC NODE: READY" on stdout, exit 0
#   NOT READY: "OPSLY MAC NODE: NOT READY" + "BLOCKERS:" + one "- <reason>"
#              line per FAIL check, exit 1
#
# Flags:
#   --json    machine-readable output instead of the human-readable contract
#             (still honors the same exit code)
#   --strict  additionally treat WARN-level findings as blockers
#
# Every check below is one of:
#   REAL      — actually exercised against live state on the machine running this
#   BEST_EFFORT — attempted; degrades to WARN (not a false FAIL) when the
#                 dependency it needs (a command, a file that another PR hasn't
#                 merged yet, network access) isn't present
#   NOT_WIRED — the underlying mechanism doesn't exist anywhere yet; reported
#               as an explicit WARN naming the gap, never faked as a pass
#
# This script cannot be exercised end-to-end outside a real Mac (launchd,
# tmux, and the actual bridges are macOS/host-specific). Its check functions
# are written to be sourced and unit-tested in isolation — see
# scripts/ops/__tests__/mac-ephemeral-runtime-doctor.test.mjs.
# No `-e`: this script's job is to run every check and collect all results,
# not abort on the first non-zero command. Individual checks handle their
# own failure paths explicitly via if/else.
set -uo pipefail

JSON_OUTPUT=0
STRICT=0
for arg in "$@"; do
  case "${arg}" in
    --json) JSON_OUTPUT=1 ;;
    --strict) STRICT=1 ;;
    -h|--help)
      sed -n '2,15p' "$0"
      exit 0
      ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}"

# ---- result collection -----------------------------------------------------
# Each entry is "STATUS\tNAME\tMESSAGE". STATUS is PASS, WARN, or FAIL.
DOCTOR_RESULTS=()

record() {
  local status="$1" name="$2" message="$3"
  DOCTOR_RESULTS+=("$(printf '%s\t%s\t%s' "${status}" "${name}" "${message}")")
}

pass() { record PASS "$1" "$2"; }
warn() { record WARN "$1" "$2"; }
fail() { record FAIL "$1" "$2"; }

# ---- checks -----------------------------------------------------------------
# Each check_* function is independently callable/testable via sourcing.

check_os() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    pass os "macOS confirmed"
  else
    fail os "expected Darwin, actual $(uname -s) — this doctor targets the Mac execution node"
  fi
}

check_required_commands() {
  local cmd
  for cmd in git node npm npx tmux doppler gh launchctl curl; do
    if command -v "${cmd}" >/dev/null 2>&1; then
      pass "command:${cmd}" "available"
    else
      fail "command:${cmd}" "missing required command: ${cmd}"
    fi
  done
}

check_optional_runtimes() {
  local cmd
  for cmd in opencode claude codex hermes; do
    if command -v "${cmd}" >/dev/null 2>&1; then
      pass "runtime:${cmd}" "installed"
    else
      warn "runtime:${cmd}" "not installed — tasks routed to this runtime will fail until installed"
    fi
  done
}

# Node identity: config/trusted-execution-nodes.json is the public metadata
# source. Secret enrollment/auth enforcement is tracked separately and is not
# inferred from registry presence.
check_node_identity() {
  local registry="config/trusted-execution-nodes.json"
  if [[ ! -f "${registry}" ]]; then
    warn node_identity "config/trusted-execution-nodes.json missing — node identity unverified"
    return
  fi
  local node_id="${OPSLY_NODE_ID:-macbook-personal-01}"
  if command -v node >/dev/null 2>&1 && node -e "
    const fs = require('fs');
    const registry = JSON.parse(fs.readFileSync('${registry}', 'utf8'));
    const found = (registry.nodes || []).some((n) => n.node_id === '${node_id}');
    process.exit(found ? 0 : 1);
  " 2>/dev/null; then
    pass node_identity "node_id '${node_id}' present in trusted-execution-nodes.json"
  else
    fail node_identity "node_id '${node_id}' not found in config/trusted-execution-nodes.json"
  fi
}

# Repository/ref state: reuses the same trusted-branch convention as
# scripts/ops/dispatch-prompt-queue.sh (#1194) rather than inventing a second
# notion of "trusted branch".
check_repo_ref_state() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    fail repo_ref "not inside a git work tree"
    return
  fi
  local trusted_branch="${NIGHT_QUEUE_TRUSTED_BRANCH:-main}"
  local branch
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
  local sha
  sha="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
  if [[ -z "${branch}" || "${branch}" == "HEAD" ]]; then
    fail repo_ref "detached HEAD at ${sha} — not the trusted branch (${trusted_branch})"
    return
  fi
  if [[ "${branch}" != "${trusted_branch}" ]]; then
    fail repo_ref "checked out branch '${branch}' (${sha}) is not the trusted branch '${trusted_branch}'"
    return
  fi
  pass repo_ref "on trusted branch ${trusted_branch} at ${sha}"
}

# External-agent repos: config/external-runtime-policy.json (#1216) names which
# runtimes should be cloned at a reviewed tag+SHA under clone_root. Existence
# is checked; SHA is reported for a human to compare against the reviewed
# value, since this doctor has no independent source of "the reviewed SHA" to
# verify against yet.
check_external_agent_repos() {
  local policy="config/external-runtime-policy.json"
  if [[ ! -f "${policy}" ]]; then
    warn external_agent_repos "config/external-runtime-policy.json missing — cannot enumerate expected clones"
    return
  fi
  if ! command -v node >/dev/null 2>&1; then
    warn external_agent_repos "node unavailable — skipped"
    return
  fi
  local clone_root
  clone_root="$(node -e "
    const fs = require('fs');
    const p = JSON.parse(fs.readFileSync('${policy}', 'utf8'));
    console.log((p.clone_root || '~/.opsly/external-agents').replace(/^~/, process.env.HOME || ''));
  " 2>/dev/null)"
  [[ -n "${clone_root}" ]] || clone_root="${HOME}/.opsly/external-agents"

  local repos_json
  repos_json="$(node -e "
    const fs = require('fs');
    const p = JSON.parse(fs.readFileSync('${policy}', 'utf8'));
    const rows = (p.repositories_now || []).filter((r) => r.kind === 'external-agent-runtime');
    console.log(rows.map((r) => r.id).join('\n'));
  " 2>/dev/null)"

  if [[ -z "${repos_json}" ]]; then
    warn external_agent_repos "no external-agent-runtime entries declared"
    return
  fi

  local id dir sha
  while IFS= read -r id; do
    [[ -n "${id}" ]] || continue
    dir="${clone_root}/${id}"
    if [[ ! -d "${dir}" ]]; then
      warn "external_agent_repo:${id}" "not cloned at ${dir} — run bootstrap if this runtime is needed"
      continue
    fi
    sha="$(git -C "${dir}" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
    pass "external_agent_repo:${id}" "present at ${dir} (${sha}) — verify against the reviewed tag/SHA manually"
  done <<<"${repos_json}"
}

check_doppler_secrets() {
  if ! command -v doppler >/dev/null 2>&1; then
    fail doppler_secrets "doppler CLI missing"
    return
  fi
  if doppler run --project ops-intcloudsysops --config prd -- bash -lc \
    'test -n "$REDIS_URL" && test -n "$PLATFORM_ADMIN_TOKEN" && test -n "$OPSLY_CLI_AGENT_TOKEN"' \
    >/dev/null 2>&1; then
    pass doppler_secrets "REDIS_URL, PLATFORM_ADMIN_TOKEN, OPSLY_CLI_AGENT_TOKEN present"
  else
    fail doppler_secrets "Doppler missing one of REDIS_URL, PLATFORM_ADMIN_TOKEN, OPSLY_CLI_AGENT_TOKEN"
  fi
}

check_launchd_infra() {
  if ! command -v launchctl >/dev/null 2>&1; then
    warn launchd "launchctl unavailable on this host — skipped"
    return
  fi
  local label
  for label in \
    com.opsly.orchestrator-mac \
    com.opsly.local-agents-worker \
    com.opsly.prompt-watcher \
    com.opsly.prompt-seed \
    com.opsly.bridge.opencode \
    com.opsly.bridge.claude \
    com.opsly.bridge.codex \
    com.opsly.bridge.hermes
  do
    if launchctl print "gui/$(id -u)/${label}" >/dev/null 2>&1; then
      pass "launchd:${label}" "loaded"
    else
      warn "launchd:${label}" "not loaded"
    fi
  done
}

check_bridge_health() {
  local port="$1" expected="$2"
  local body
  body="$(curl -fsS --max-time 3 "http://127.0.0.1:${port}/health" 2>/dev/null || true)"
  if [[ -z "${body}" ]]; then
    fail "bridge:${expected}" "unhealthy or unreachable on 127.0.0.1:${port}"
    return
  fi
  if ! grep -q "\"agent\":\"${expected}\"" <<<"${body}"; then
    fail "bridge:${expected}" "unexpected /health payload on port ${port}"
    return
  fi
  if ! grep -q '"auth_required":true' <<<"${body}" || ! grep -q '"auth_configured":true' <<<"${body}"; then
    fail "bridge:${expected}" "auth not fail-closed/configured"
    return
  fi
  if ! grep -q '"execution_model":"ephemeral-tmux-session"' <<<"${body}"; then
    fail "bridge:${expected}" "not using ephemeral-tmux-session execution model"
    return
  fi
  pass "bridge:${expected}" "healthy, fail-closed, ephemeral on port ${port}"
}

check_bridges() {
  check_bridge_health 5004 opencode
  check_bridge_health 5002 claude
  check_bridge_health 5005 codex
  check_bridge_health 5007 hermes
}

# VPS/control-plane + queue reachability share one canonical script
# (check-local-agent-readiness.sh) rather than this doctor re-implementing an
# HTTP client — see that script for the exact orchestrator health + BullMQ/
# Redis ping it performs.
check_control_plane_and_queue() {
  if [[ -z "${PLATFORM_ADMIN_TOKEN:-}" ]]; then
    warn control_plane_queue "PLATFORM_ADMIN_TOKEN absent in this shell — run doctor through doppler run to check control-plane/queue reachability"
    return
  fi
  local out
  if out="$(./scripts/ops/check-local-agent-readiness.sh 2>&1)"; then
    pass control_plane_queue "VPS control-plane reachable, local-agents queue ready"
  else
    fail control_plane_queue "control-plane/queue not ready: $(tail -n1 <<<"${out}")"
  fi
}

# Heartbeat freshness is exposed by the authenticated local control plane.
# Before the heartbeat endpoint is deployed, this remains a WARN rather than
# fabricating a PASS. Once available, stale/missing canonical Mac services are
# a real blocker.
check_heartbeat() {
  if [[ -z "${PLATFORM_ADMIN_TOKEN:-}" ]]; then
    warn heartbeat "PLATFORM_ADMIN_TOKEN absent in this shell — run doctor through doppler to verify heartbeat freshness"
    return
  fi

  local base_url="${OPSLY_ORCHESTRATOR_URL:-http://127.0.0.1:3011}"
  local cfg response code
  cfg="$(mktemp "${TMPDIR:-/tmp}/opsly-heartbeat-curl.XXXXXX")"
  chmod 600 "${cfg}"
  printf 'silent\nshow-error\nheader = "Authorization: Bearer %s"\n' "${PLATFORM_ADMIN_TOKEN}" >"${cfg}"

  code="$(
    curl -sS -o "${cfg}.body" -w '%{http_code}' -K "${cfg}"       "${base_url}/api/local/heartbeats" 2>/dev/null || true
  )"
  response="$(cat "${cfg}.body" 2>/dev/null || true)"
  rm -f "${cfg}" "${cfg}.body"

  if [[ "${code}" == "404" || -z "${code}" ]]; then
    warn heartbeat "heartbeat freshness endpoint not deployed yet"
    return
  fi
  if [[ "${code}" != "200" ]]; then
    fail heartbeat "heartbeat endpoint returned HTTP ${code}"
    return
  fi

  if node -e '
    const body = JSON.parse(process.argv[1]);
    const expected = new Set(["mac-orchestrator", "mac-local-agents-worker"]);
    const rows = Array.isArray(body.heartbeats) ? body.heartbeats : [];
    for (const row of rows) {
      if (row && typeof row.service_name === "string") expected.delete(row.service_name);
      if (!row?.alive || typeof row.age_ms !== "number" || row.age_ms > 60000) process.exit(2);
    }
    if (expected.size > 0 || body.all_alive !== true) process.exit(3);
  ' "${response}" 2>/dev/null; then
    pass heartbeat "mac-orchestrator and mac-local-agents-worker heartbeats are fresh"
  else
    fail heartbeat "one or more canonical Mac heartbeats are missing or stale"
  fi
}

check_session_manager() {
  if [[ -f "lib/session-manager/dist/index.js" ]]; then
    pass session_manager "lib/session-manager built"
  elif [[ -f "lib/session-manager/src/index.ts" ]]; then
    warn session_manager "lib/session-manager present but not built — run npm run build --workspace=@intcloudsysops/session-manager"
  else
    fail session_manager "lib/session-manager not found"
  fi
}

check_task_source_guard() {
  if [[ -f "lib/agent-task-core/src/task-source-guard.ts" ]] || [[ -f "lib/agent-task-core/dist/task-source-guard.js" ]]; then
    pass task_source_guard "TaskSourceGuard present in lib/agent-task-core"
  else
    warn task_source_guard "TaskSourceGuard missing — provenance contract unavailable"
  fi
}

check_legacy_flags_disabled() {
  if [[ -f "runtime/logs/agents-autopilot.pid" ]]; then
    fail legacy_autopilot "runtime/logs/agents-autopilot.pid exists — run ./scripts/stop-agents-autopilot.sh"
  else
    pass legacy_autopilot "no legacy autopilot pid file"
  fi

  if [[ "${OPSLY_ALLOW_LEGACY_LOCAL_AGENT_PAYLOAD:-}" == "true" ]]; then
    fail legacy_payload_override "OPSLY_ALLOW_LEGACY_LOCAL_AGENT_PAYLOAD=true is set — break-glass override must not be left on for idle/healthy state"
  else
    pass legacy_payload_override "legacy local-agent payload break-glass is off"
  fi
}

# Forbidden persistent runtime: an AI CLI process running with no
# corresponding opsly-task-* tmux session is exactly the "persistent AI
# runtime" #1216/#1222 forbid. A CLI running *inside* a tracked session is a
# legitimate in-flight ephemeral task, not a blocker.
check_no_forbidden_persistent_runtime() {
  local sessions=""
  if command -v tmux >/dev/null 2>&1; then
    sessions="$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^opsly-task-' || true)"
  fi
  local proc any_running=0
  for proc in opencode hermes codex claude; do
    if pgrep -x "${proc}" >/dev/null 2>&1; then
      any_running=1
      if [[ -z "${sessions}" ]]; then
        fail "persistent_runtime:${proc}" "${proc} is running with no active opsly-task-* session — forbidden persistent AI runtime"
      else
        warn "persistent_runtime:${proc}" "${proc} is running; an opsly-task-* session exists so this may be a legitimate in-flight task — verify manually"
      fi
    fi
  done
  if [[ "${any_running}" == "0" ]]; then
    pass no_persistent_runtime "no AI CLI process is running"
  fi

  if [[ -n "${sessions}" ]]; then
    warn ephemeral_sessions "active opsly-task-* session(s) present: $(tr '\n' ',' <<<"${sessions}")"
  else
    pass ephemeral_sessions "no opsly-task-* sessions (healthy idle state)"
  fi
}

run_all_checks() {
  check_os
  check_required_commands
  check_node_identity
  check_repo_ref_state
  check_optional_runtimes
  check_external_agent_repos
  check_doppler_secrets
  check_launchd_infra
  check_bridges
  check_control_plane_and_queue
  check_heartbeat
  check_session_manager
  check_task_source_guard
  check_legacy_flags_disabled
  check_no_forbidden_persistent_runtime
}

# ---- reporting ---------------------------------------------------------------

json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  printf '%s' "${s}"
}

print_human() {
  local blockers=() warnings=()
  local entry status name message
  for entry in "${DOCTOR_RESULTS[@]}"; do
    IFS=$'\t' read -r status name message <<<"${entry}"
    case "${status}" in
      FAIL) blockers+=("${name}: ${message}") ;;
      WARN) warnings+=("${name}: ${message}") ;;
    esac
  done

  local hard_blockers=("${blockers[@]}")
  if [[ "${STRICT}" == "1" ]]; then
    hard_blockers+=("${warnings[@]}")
  fi

  if [[ "${#hard_blockers[@]}" -eq 0 ]]; then
    echo "OPSLY MAC NODE: READY"
    if [[ "${#warnings[@]}" -gt 0 ]]; then
      echo "WARNINGS:"
      local w
      for w in "${warnings[@]}"; do echo "- ${w}"; done
    fi
    return 0
  fi

  echo "OPSLY MAC NODE: NOT READY"
  echo "BLOCKERS:"
  local b
  for b in "${hard_blockers[@]}"; do echo "- ${b}"; done
  return 1
}

print_json() {
  local checks_json="[" first=1
  local entry status name message
  local blockers=0 warnings=0
  for entry in "${DOCTOR_RESULTS[@]}"; do
    IFS=$'\t' read -r status name message <<<"${entry}"
    [[ "${first}" == "1" ]] || checks_json+=","
    first=0
    checks_json+="{\"status\":\"$(json_escape "${status}")\",\"name\":\"$(json_escape "${name}")\",\"message\":\"$(json_escape "${message}")\"}"
    [[ "${status}" == "FAIL" ]] && blockers=$((blockers + 1))
    [[ "${status}" == "WARN" ]] && warnings=$((warnings + 1))
  done
  checks_json+="]"

  local ready=1
  if [[ "${blockers}" -gt 0 ]]; then ready=0; fi
  if [[ "${STRICT}" == "1" && "${warnings}" -gt 0 ]]; then ready=0; fi

  local status_str="READY"
  [[ "${ready}" == "0" ]] && status_str="NOT_READY"

  printf '{"status":"%s","blocker_count":%d,"warning_count":%d,"strict":%s,"checks":%s}\n' \
    "${status_str}" "${blockers}" "${warnings}" \
    "$( [[ "${STRICT}" == "1" ]] && echo true || echo false )" \
    "${checks_json}"

  [[ "${ready}" == "1" ]]
}

# ---- main ---------------------------------------------------------------------
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  run_all_checks
  if [[ "${JSON_OUTPUT}" == "1" ]]; then
    print_json
    exit $?
  else
    print_human
    exit $?
  fi
fi
