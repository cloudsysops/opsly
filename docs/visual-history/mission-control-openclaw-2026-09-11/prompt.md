# Opsly Mission Control — OpenClaw cockpit reference

Create a wide, cinematic dark mission-control dashboard for Opsly with OpenClaw-inspired visual language.

Required surfaces:
- live KPIs for agents/runtimes/tasks/workers/sessions/health
- central topology showing VPS control plane, Mac execution node, PC Gamer compute node
- cloud services grouped by role
- BullMQ queue and runtime health
- system activity
- cost/free-tier governance
- healthy-idle invariant
- real external runtimes: Hermes Agent, OpenCode, Codex CLI, Claude Code, Goose, OpenClaw

Rules:
- this is a visual reference, not a source of truth for metrics
- implementation must bind to existing Mission Control APIs
- unavailable integrations must render planned/not connected, never fake healthy values
- idle health means no ephemeral AI task runtime remains active
