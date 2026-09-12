---
id: mac-ephemeral-runtime-bootstrap-035
status: pending
agent: cursor
agent_role: operator
max_steps: 20
priority: 1
requires_pr: false
autonomy_approved: false
risk: medium
---

# Cursor task — configure the physical Mac for Opsly ephemeral runtimes

## Objective

Bring the physical Mac to the canonical runtime model without starting any persistent AI CLI process.

Persistent:
- BullMQ local-agents worker
- prompt dispatcher
- authenticated localhost bridges
- heartbeats/control services

Ephemeral:
- Hermes
- OpenCode
- Codex
- Claude

Each AI runtime must exist only inside `opsly-task-<id>-<role>`.

## Preconditions

1. Checkout a branch containing the canonical ephemeral runtime changes.
2. Working tree clean.
3. Do not expose Redis or bridge ports publicly.
4. Do not print Doppler secrets.
5. Do not enable `OPSLY_ALLOW_LEGACY_LOCAL_AGENT_PAYLOAD`.

## Step 1 — inspect only

Run:

```bash
uname -a
git status --short --branch
node --version
npm --version
tmux -V
doppler --version
gh --version
tailscale status || true
```

For real runtime binaries:

```bash
command -v opencode || true
command -v claude || true
command -v codex || true
command -v hermes || true
```

Never install an unreviewed runtime from a random fork.

## Step 2 — dry-run configuration

```bash
npm run opsly:mac:install -- --dry-run
npm run opsly:mac:doctor
```

Expected:
- no hardcoded /Users/dragon paths
- no persistent OpenCode TUI
- no legacy autopilot
- missing runtime binaries are WARN, not hidden

## Step 3 — verify Doppler without printing values

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  bash -lc 'test -n "$REDIS_URL" && test -n "$PLATFORM_ADMIN_TOKEN" && test -n "$OPSLY_CLI_AGENT_TOKEN"'
```

If non-zero: STOP and report BLOCKED. Do not substitute secrets manually into files.

## Step 4 — stop legacy autonomous processes

```bash
./scripts/status-agents-autopilot.sh || true
./scripts/stop-agents-autopilot.sh || true
rm -f runtime/logs/agents-autopilot.pid
```

Confirm:

```bash
pgrep -af 'agents-autopilot|exec opencode|hermes.*chat|codex.*exec|claude.*-p' || true
```

Do not kill unrelated interactive developer sessions without identifying them.

## Step 5 — install canonical launchd services

```bash
npm run opsly:mac:install
sleep 5
npm run opsly:mac:doctor:strict
```

Inspect:

```bash
launchctl print gui/$(id -u)/com.opsly.local-agents-worker
launchctl print gui/$(id -u)/com.opsly.prompt-queue
launchctl print gui/$(id -u)/com.opsly.bridge.opencode
launchctl print gui/$(id -u)/com.opsly.bridge.claude
launchctl print gui/$(id -u)/com.opsly.bridge.codex
launchctl print gui/$(id -u)/com.opsly.bridge.hermes
```

## Step 6 — readiness

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/ops/check-local-agent-readiness.sh
```

Required final marker:

```text
OPSLY_LOCAL_QUEUE_READY
```

## Step 7 — bridge health

Only localhost:

```bash
for port in 5002 5004 5005 5007; do
  curl -fsS "http://127.0.0.1:$port/health" || exit 1
  echo
done
```

Each bridge must report:
- auth_required=true
- auth_configured=true
- execution_model=ephemeral-tmux-session

A healthy bridge does NOT imply an AI process is running.

## Step 8 — idle invariant

Before dispatching a task:

```bash
tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^opsly-task-' || true
```

Expected: zero task sessions while idle.

## Step 9 — governed smoke

Do not use a raw bridge request and do not bypass AgentTask.

Run the existing governed harmless E2E only after its PR/gates are approved. During execution observe:

```bash
watch -n 1 "tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^opsly-task-' || true"
```

Expected during job:
`opsly-task-<id>-<role>`

Expected after job:
session absent.

## Evidence report

Return exactly:

```text
TASK: mac-ephemeral-runtime-bootstrap-035
STATUS: PASS | BLOCKED | FAIL
GIT_HEAD:
MACOS:
NODE:
TMUX:
DOPPLER:
TAILSCALE:
RUNTIMES:
LAUNCHD:
QUEUE_READINESS:
BRIDGE_HEALTH:
ACTIVE_TASK_SESSIONS_IDLE:
LEGACY_AUTOPILOT:
TESTS:
BLOCKERS:
DECISIONS_NEEDED:
NEXT_ACTION:
```

## Fail-closed rules

STOP immediately if:
- Doppler required secret checks fail
- Redis/BullMQ readiness fails
- a bridge binds outside localhost unexpectedly
- bridge auth is not configured
- legacy autopilot remains alive
- the governed smoke arrives without AgentTaskEnvelopeV1
- any command would require production data mutation or deployment
