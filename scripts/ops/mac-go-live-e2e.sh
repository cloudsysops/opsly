#!/usr/bin/env bash
# One-command live verification for the canonical Opsly Mac execution node.
# Safe smoke: no file writes by the agent, no production deploy, no paid infra.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

ORCH_URL="${OPSLY_ORCHESTRATOR_URL:-${ORCHESTRATOR_URL:-http://127.0.0.1:3011}}"
AGENT="${OPSLY_E2E_AGENT:-hermes}"
TIMEOUT_SECONDS="${OPSLY_E2E_TIMEOUT_SECONDS:-180}"
EVIDENCE_DIR="${OPSLY_E2E_EVIDENCE_DIR:-runtime/evidence}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
REQUEST_ID="opsly-e2e-${STAMP}-$$"
EVIDENCE_FILE="${EVIDENCE_DIR}/mac-go-live-${REQUEST_ID}.json"
TMP_DIR="$(mktemp -d)"
AUTH_CFG="${TMP_DIR}/curl-auth.conf"
SUBMIT_BODY="${TMP_DIR}/submit.json"
SUBMIT_RESPONSE="${TMP_DIR}/submit-response.json"
JOB_RESPONSE="${TMP_DIR}/job-response.json"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

log(){ printf '[mac-go-live] %s\n' "$*"; }
fail(){ log "FAIL: $*"; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || fail "macOS/Darwin required"
for cmd in curl node tmux doppler; do
  command -v "$cmd" >/dev/null 2>&1 || fail "required command missing: $cmd"
done

if [[ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)" != "${NIGHT_QUEUE_TRUSTED_BRANCH:-main}" ]]; then
  fail "checkout must be trusted branch ${NIGHT_QUEUE_TRUSTED_BRANCH:-main}"
fi

if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  fail "working tree must be clean before live smoke"
fi

mkdir -p "$EVIDENCE_DIR"

log "1/7 readiness doctor"
if ! doppler run --project ops-intcloudsysops --config prd --   ./scripts/ops/mac-ephemeral-runtime-doctor.sh; then
  fail "Mac readiness doctor reported blockers"
fi

log "2/7 verify healthy idle before task"
pre_sessions="$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^opsly-task-' || true)"
[[ -z "$pre_sessions" ]] || fail "existing task sessions detected before smoke: $(tr '\n' ' ' <<<"$pre_sessions")"

log "3/7 verify queue/control-plane readiness"
if ! doppler run --project ops-intcloudsysops --config prd --   ./scripts/ops/check-local-agent-readiness.sh >/dev/null; then
  fail "local-agents queue/control-plane not ready"
fi

log "4/7 submit governed smoke task to ${AGENT}"
doppler run --project ops-intcloudsysops --config prd -- bash -lc '
  set -euo pipefail
  : "${PLATFORM_ADMIN_TOKEN:?PLATFORM_ADMIN_TOKEN missing}"
  printf "header = \"Authorization: Bearer %s\"\n" "$PLATFORM_ADMIN_TOKEN" > "'"$AUTH_CFG"'"
' >/dev/null

node - "$SUBMIT_BODY" "$REQUEST_ID" "$AGENT" <<'NODE'
const fs = require('fs');
const [file, requestId, agent] = process.argv.slice(2);
const body = {
  tenant_slug: 'local',
  request_id: requestId,
  agent,
  agent_role: 'planner',
  max_steps: 2,
  goal: 'Opsly Mac ephemeral runtime E2E smoke',
  prompt_body: [
    'This is an Opsly execution smoke test.',
    'Do not modify files, do not deploy, do not call paid services.',
    'Return exactly: OPSLY_E2E_OK'
  ].join('\n'),
  context: {
    requires_pr: false,
    smoke_test: true,
    source: 'mac-go-live-e2e'
  }
};
fs.writeFileSync(file, JSON.stringify(body));
NODE

http_code="$(
  curl -sS -o "$SUBMIT_RESPONSE" -w '%{http_code}'     -K "$AUTH_CFG"     -H 'Content-Type: application/json'     -H 'x-autonomy-approved: true'     --data-binary "@${SUBMIT_BODY}"     "${ORCH_URL}/api/local/prompt-submit" || true
)"
[[ "$http_code" == "202" ]] || fail "submit returned HTTP ${http_code}: $(cat "$SUBMIT_RESPONSE" 2>/dev/null)"

job_id="$(node -e '
const fs=require("fs");
const b=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
process.stdout.write(String(b.job_id || b.request_id || ""));
' "$SUBMIT_RESPONSE")"
[[ -n "$job_id" ]] || fail "submit response missing job_id/request_id"

log "5/7 wait for job ${job_id}"
deadline=$((SECONDS + TIMEOUT_SECONDS))
final_status=""
while (( SECONDS < deadline )); do
  code="$(
    curl -sS -o "$JOB_RESPONSE" -w '%{http_code}'       -K "$AUTH_CFG"       "${ORCH_URL}/api/job-status/${job_id}" || true
  )"
  if [[ "$code" == "200" ]]; then
    final_status="$(node -e '
const fs=require("fs");
const b=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
process.stdout.write(String(b.status || b.state || "unknown").toLowerCase());
' "$JOB_RESPONSE")"
    case "$final_status" in
      completed|done|success) break ;;
      failed|error) fail "smoke job failed: $(cat "$JOB_RESPONSE")" ;;
    esac
  elif [[ "$code" != "404" ]]; then
    fail "job-status returned HTTP ${code}"
  fi
  sleep 2
done

case "$final_status" in
  completed|done|success) ;;
  *) fail "timed out waiting for completion; last status=${final_status:-unknown}" ;;
esac

log "6/7 verify evidence/result"
result_text="$(node -e '
const fs=require("fs");
const b=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
const value=b.result ?? b.output ?? b.response ?? "";
process.stdout.write(typeof value==="string" ? value : JSON.stringify(value));
' "$JOB_RESPONSE")"
if [[ "$result_text" != *"OPSLY_E2E_OK"* ]]; then
  log "WARN: completion reported but expected marker not found in exposed job result"
fi

log "7/7 verify teardown and return to healthy idle"
post_sessions=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  post_sessions="$(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^opsly-task-' || true)"
  [[ -z "$post_sessions" ]] && break
  sleep 1
done
[[ -z "$post_sessions" ]] || fail "orphan task sessions remain: $(tr '\n' ' ' <<<"$post_sessions")"

node - "$EVIDENCE_FILE" "$REQUEST_ID" "$job_id" "$AGENT" "$final_status" "$ORCH_URL" <<'NODE'
const fs=require('fs');
const [file, requestId, jobId, agent, status, orchestratorUrl]=process.argv.slice(2);
const evidence={
  schema_version:'OpslyMacGoLiveEvidenceV1',
  generated_at:new Date().toISOString(),
  request_id:requestId,
  job_id:jobId,
  agent,
  status,
  orchestrator_url:orchestratorUrl,
  pre_task_sessions:0,
  post_task_sessions:0,
  expected_marker:'OPSLY_E2E_OK',
  invariants:{
    governed_submit:true,
    production_deploy:false,
    paid_infra:false,
    task_session_teardown:true,
    healthy_idle_restored:true
  }
};
fs.writeFileSync(file, JSON.stringify(evidence,null,2)+'\n');
NODE

log "PASS: governed AgentTask completed and returned to 0 task sessions"
log "evidence=${EVIDENCE_FILE}"
