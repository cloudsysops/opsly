---
name: opsly-claude-codex-review
description: >
  Claude Code ↔ Codex MCP bridge for Opsly AI Board: Claude builds,
  Codex reviews (no concurrent edits). Triggers: codex review, claude-codex-bridge,
  AI board review, independent reviewer.
status: active
owner: agents
last_review: 2026-09-10
type: skill
tags:
  - opsly/agent-skill
  - mcp
  - review
---

# Opsly — Claude builder / Codex reviewer

> **Triggers:** `codex review`, `claude-codex-bridge`, `/codex`, `AI board`, `independent reviewer`, `REQUEST_CHANGES`
> **Priority:** HIGH (when using Claude Code + Codex on the same task)
> **Doc:** `docs/03-agents/CLAUDE-CODEX-MCP-BRIDGE.md`

## Roles

| Agent | Role | Edits? |
| ----- | ---- | ------ |
| Claude Code | Builder / architect | Yes |
| Codex (via MCP `codex`) | Independent reviewer | **No** |

## Procedure

1. Claude implements within the task scope.
2. Run tests / type-check for the touched workspace.
3. Ask Codex via MCP (`codex_review_code` or `/codex review …`) with **exact diff** + acceptance criteria.
4. Require findings: `CRITICAL` | `IMPORTANT` | `MINOR`.
5. If CRITICAL/IMPORTANT → Claude fixes → re-review **only** changed scope.
6. Stop after **3** rounds or when status is `APPROVED` / `BLOCKED`.
7. Record outcome in the task ledger / PR.

**Never** call `codex_implement` for AI Board reviews unless a human explicitly overrides.

## Config

- Project: `.mcp.json` → server `codex` (`claude-codex-bridge serve codex`)
- Operator: `~/.codex/config.toml` → `[mcp_servers.claude]`
- Optional: `.claude/agents/codex-teammate.md`, local `/codex` skill under `.claude/skills/` (gitignored)

Complementary (not a substitute): OpenClaw ACP `@openclaw/acpx` for Discord/TUI multi-harness spawn.
