---
status: draft
owner: operations
last_review: 2026-05-24
type: config
tags:
  - opsly/codex-config
---

# Codex in Opsly

Codex works as an OpenClaw-aware executor and systems operator for Opsly.

## Startup Context

1. Read `AGENTS.md`.
2. Read `VISION.md`.
3. Read `docs/03-agents/AGENT-BRAIN-CONTRACT.md`.
4. Prefer repo knowledge in this order:
   - `config/github-module-graph.json`
   - `config/knowledge-index.json`
   - `docs/brain/`
   - code under `apps/*`, `packages/*`, `scripts/*`, `infra/*`
5. Apply `docs/03-agents/AGENT-GUARDRAILS.md`.
6. Apply `docs/01-development/GIT-WORKFLOW.md`.
7. Read current hardening and production notes when relevant:
   - `docs/reports/CYBER-NEO-OPSLY-2026-05-21.md`
   - `docs/blueprints/OPSLY-ENTERPRISE-HARDENING-BLUEPRINT.md`
   - `docs/tenants/peskids/PRODUCTION-HARDENING-BLUEPRINT.md`

## SysOps Rules

- Use Doppler wrappers for commands that need secrets or production parity.
- Prefer Tailscale SSH, existing runbooks, and repo scripts over ad hoc shell work.
- Treat Codex as the worker/executor for Opsly, not the architect of record.
- Keep this bootstrap scoped to Opsly work only.
- For Browser + terminal sessions, follow `docs/runbooks/COMPUTER-CONTROL-OPERATOR-MODE.md`.
- When a task is security-oriented, prefer Cyber Neo helpers under `.agents/skills/cyber-neo/`.
- When a task needs a blueprint or implementation plan, prefer The Architect under `.agents/skills/the-architect/`.

## Brain Rule

Do not create a separate memory system for Codex. Use the shared Opsly Brain:

- Obsidian vault: `docs/brain/`
- Knowledge index: `config/knowledge-index.json`
- Module graph: `config/github-module-graph.json`
- Graphyfi MCP tool: `apps/mcp/src/tools/graphyfi.ts`
- Local helper skills:
  - `.agents/skills/cyber-neo/`
  - `.agents/skills/the-architect/`

If the module graph is missing, inspect the repo directly and document the gap.

## Execution Rule

Use PR-first workflow for code, infra, tests and API contracts. Direct `main`
pushes are only for explicitly allowed documentation closures.

## Current Production Baseline

- VPS control plane is live on Docker Compose behind Traefik at `op-sly.com`.
- Peskids production is live on the VPS:
  - `https://peskids.op-sly.com`
  - `https://api.op-sly.com/api/health`
  - `https://api.op-sly.com/peskids/lead-form.html`
  - `https://api.op-sly.com/peskids/feedback-form.html`
- Tenant automation stacks remain on VPS per slug, with n8n and Uptime Kuma as the default customer-facing bundle.

## Installed Agent Packs

- `vendor/cyber-neo` and `vendor/the-architect` are pinned local copies of external agent packs.
- Claude Code has matching installs under `~/.claude/skills/cyber-neo` and `~/.claude/agents/the-architect`.
- Do not duplicate these packs into a second parallel system; reuse the pinned vendor copy or the local skill path.

---

## Enlaces relacionados

- [[README|.]]
- [[README|Inicio]]
