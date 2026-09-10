---
status: canon
owner: agents
last_review: 2026-09-10
---

# Claude Code ↔ Codex — MCP bridge (Opsly)

Bidirectional IDE bridge so **Claude Code** and **Codex CLI** can call each other as MCP tools in the same repo — without two builders editing the same branch at once.

Upstream package: [`claude-codex-bridge`](https://github.com/Dunqing/claude-codex-bridge) (`npx claude-codex-bridge@0.3.1`).

Longer-term candidate (do not block on it): [`mcp-agents`](https://github.com/thomaswitt/mcp-agents) / app-server path if the bridge’s `codex mcp-server` path is retired.

## Roles (locked)

| Agent | Role | Edits files? |
| ----- | ---- | ------------ |
| **Claude Code** | Builder / architect | Yes |
| **Codex** | Independent reviewer / verifier | **No** (diff + findings only) |

Do **not** run both as concurrent developers on one branch.

## Two harnesses (complementary)

| Layer | What it is | Use when |
| ----- | ---------- | -------- |
| **This MCP bridge** | Claude ↔ Codex inside the IDE / CLI session | Same-repo BUILD → REVIEW loops |
| **OpenClaw ACP (`@openclaw/acpx`)** | Gateway spawn of claude/codex/cursor/… (Discord/TUI) | Multi-harness ops, Discord-bound teams |

They are **not** substitutes. ACP does not replace project `.mcp.json`; the bridge does not replace the gateway.

## Architecture

```text
Claude Code  --MCP(stdio)-->  claude-codex-bridge serve codex  -->  Codex CLI
Codex CLI    --MCP(stdio)-->  claude-codex-bridge serve claude -->  Claude Code
```

Opsly AI Board pattern:

```text
Claude BUILD
  → tests
  → Codex REVIEW (diff only)
  → REQUEST_CHANGES? ──yes──→ Claude repair (max 3 rounds)
                 └─no──→ AI_BOARD_APPROVED / APPROVED
```

## Claude Code resume checklist (pass on return)

Before editing or deploying, Claude Code should:

1. `git fetch origin && git pull --ff-only` on a **clean worktree** (not the dirty Mac Capacitor tree).
2. Confirm GitHub: `gh auth status` + SSH `git@github.com` OK.
3. Peskids live: `curl -sf https://www.peskids.com/api/health` → `git_sha` must match `origin/main` (or document lag).
4. **Never** reintroduce `next build --webpack` in `apps/peskids/Dockerfile` (CI guard + #1168).
5. Roles: Claude builds; Codex reviews only (`opsly-claude-codex-review` / `/codex`).
6. Night PRs: keep `night-merge` on content (#1160); do not daytime-merge `apps/peskids` without `hotfix-prod` / `force_daytime`.

## Prerequisites

```bash
claude --version   # e.g. 2.1.x
codex --version    # e.g. 0.14x
```

Both must be authenticated on the operator machine.

## Project config (repo)

`.mcp.json` keeps Opsly OpenClaw **and** registers Codex for Claude Code:

```json
{
  "mcpServers": {
    "opsly-openclaw": {
      "command": "npm",
      "args": ["run", "opsly:mcp:stdio"],
      "cwd": "${CLAUDE_PROJECT_DIR}"
    },
    "codex": {
      "type": "stdio",
      "command": "npx",
      "args": ["--yes", "claude-codex-bridge@0.3.1", "serve", "codex"]
    }
  }
}
```

Optional local extras (not required for MCP):

```bash
npx --yes claude-codex-bridge@0.3.1 install skill claude --local
npx --yes claude-codex-bridge@0.3.1 install agent --local
```

That installs `/codex` skill and `codex-teammate` under `.claude/` for Claude Code.

## Operator config (Codex → Claude)

On the Mac operator only — **not** committed — append to `~/.codex/config.toml`:

```toml
[mcp_servers.claude]
command = "npx"
args = ["--yes", "claude-codex-bridge@0.3.1", "serve", "claude"]
tool_timeout_sec = 600
```

Restart Codex after editing.

One-shot both directions (extras optional):

```bash
npx --yes claude-codex-bridge@0.3.1 setup both --local
# or: setup both --skip-extras
```

Prefer the pinned project `.mcp.json` over a silent rewrite of global Claude MCP when working in Opsly.

## How to use

From **Claude Code** (builder):

```text
Use Codex as an independent reviewer for this task.

Rules:
- You are the builder. Codex is the reviewer.
- Codex must not edit files.
- Send Codex the exact diff and acceptance criteria.
- Require findings: CRITICAL | IMPORTANT | MINOR
- If CRITICAL or IMPORTANT: fix yourself, then re-review only the changed scope.
- Maximum 3 review rounds.
- Do not ask Codex to redesign unrelated architecture.
- Record outcome in the task ledger.

Final status: APPROVED | REQUEST_CHANGES | BLOCKED
```

Shorter:

```text
Ask Codex to review my current changes.
```

```text
/codex review HEAD~3..HEAD
```

From **Codex** (reviewer / when asking for design critique):

```text
Ask Claude to review the architecture of this change.
```

(Still: Codex should not apply edits when acting as AI Board reviewer.)

## Hygiene

- Never put Doppler secrets, Redis URLs with passwords, or PAT values in `.mcp.json`, `.claude/settings*.json`, or this doc.
- Audit `claude mcp list` / local settings periodically; rotate anything that leaked into chat or allowlists.
- First-time `npx` MCP servers may time out until the package is cached; warm with `npx --yes claude-codex-bridge@0.3.1 --help`.

## Relation to Content OS / review gateway

Product **content** independent AI review still goes through **LLM Gateway** (`cheap` / `llama_local`) in `lib/content-studio` — see Content OS PRs / `feat/content-independent-ai-review`. This bridge is for **human IDE agent** BUILD↔REVIEW, not a second content review board.

## Enlaces relacionados

- [[03-agents/README|Agents MOC]]
- [[03-agents/AGENT-GUARDRAILS|Agent guardrails]]
- [[03-agents/IMPLEMENTATION-MCP-AGENTS|MCP multi-agent implementation (legacy guide)]]
- OpenClaw ACP: operator gateway `127.0.0.1:18789` + plugin `@openclaw/acpx`
