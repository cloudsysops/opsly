---
id: gamer-opencode-physical-acceptance-050
status: pending
priority: P1
agent: local_opencode
agent_role: executor
owner: platform
environment: local
cost_class: free
estimated_cost_usd: 0
workstream: gamer-opencode-physical-acceptance
conflict_key: gamer-opencode-physical
semantic_scope: gamer-opencode-physical/acceptance-050
requires_pr: false
requires_approval: false
paid_infra_required: false
production_deploy: false
autonomy: supervised
estimated_minutes: 15
resource_class: small
node_types: gamer
# Target host MagicDNS: smdqcia-wsl (not Windows smdqcia-pc).
# Coder tags gate (installed before acceptance; no downloads here): qwen3-coder* or qwen2.5-coder*
architecture_patterns: BullMQ, OpenCode, Ollama, ephemeral runtime
---

Reply with exactly one line containing only this marker and nothing else:

GAMER_OPENCODE_OK
