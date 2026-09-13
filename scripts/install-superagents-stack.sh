#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
DEPRECATED: superagents:install no longer installs or starts AI runtimes.

Canonical Opsly execution is:
AgentTaskEnvelopeV1
→ policy / approval
→ BullMQ local-agents
→ eligible worker
→ authenticated runtime bridge
→ Session Manager
→ ephemeral opsly-task-* session
→ real external CLI/runtime
→ evidence
→ teardown

Use the runtime-specific bootstrap/doctor paths instead:
  npm run opsly:mac:bootstrap
  npm run opsly:mac:doctor
  npm run pc-gamer:opencode:doctor
  npm run superagents:doctor

Do not restore nohup loops, persistent AI squads, or a second orchestrator.
EOF

exit 2
