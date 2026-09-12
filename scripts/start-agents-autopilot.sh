#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
DEPRECATED: persistent AI agent autopilot is disabled.

Opsly canonical execution is:
AgentTask -> policy/node auth -> capability routing -> Session Manager
-> ephemeral tmux task session -> real external CLI/runtime -> evidence -> teardown.

Keep only control infrastructure persistent (BullMQ workers, prompt watchers,
authenticated bridges, heartbeats). Do not run AI runtimes in nohup loops.

See: docs/03-agents/EXTERNAL-RUNTIME-POLICY.md
EOF
exit 2
