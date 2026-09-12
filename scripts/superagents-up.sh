#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

cat <<'EOF'
[superagents:up] DEPRECATED NAME / NEW SEMANTICS

Persistent AI squads are no longer started.
The canonical model keeps only infrastructure alive and creates real CLI
runtimes in ephemeral tmux sessions per AgentTask.

Run:
  ./scripts/superagents-doctor.sh
  npm run opsly:local-opencode-service
  npm run opsly:local-claude-service
  npm run opsly:local-codex-service
  npm run opsly:local-hermes-service

These bridges are infrastructure only. They do not keep AI agents running.
EOF

./scripts/superagents-doctor.sh
