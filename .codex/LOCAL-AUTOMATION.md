---
status: local
owner: operations
last_review: 2026-05-14
---

# Local Automation Guardrails

Use `~/opsly-workspace/opsly` as the local development root for automation.

Allowed:
- open iTerm2 with `scripts/local-iterm-open.sh`
- open Cursor/VS Code/Docker with `scripts/local-app-open.sh`
- run Docker, Colima, tests, builds, tmux, and localhost browser QA
- **Structured** OBS / OSC via `tools/live-automation/` (`dispatch.py`, `osc_send.py`) after `npm run opsly:live:install` — never raw LLM mouse

Forbidden without explicit human approval:
- `sudo`
- Keychain/iCloud access
- writing outside `~/opsly-workspace`
- exposing local agent `/execute` endpoints beyond localhost/Tailscale
- changing macOS Privacy & Security settings (the **human** must toggle TCC; Codex cannot click System Settings)

## When the human must grant permissions (checklist)

Ask the operator to complete **only** what applies; do not request Full Disk Access by default.

1. **Accessibility:** Cursor, Codex (Desktop), iTerm2, VS Code — *System Settings → Privacy & Security → Accessibility*.
2. **Automation / Apple Events:** after first `scripts/local-iterm-open.sh` run, approve *“X wants to control iTerm”* for the **caller** (Terminal / Cursor / iTerm).
3. **Input Monitoring:** iTerm2 only if paste/typing automation fails.
4. **Screen Recording:** only for visual QA.
5. **Full Disk Access:** avoid; if unavoidable, iTerm2 or Cursor only.

Then: full quit (Cmd+Q) of affected apps, or `killall iTerm2`.

### Codex shell ENOENT (`zsh`/`bash`/`sh` not found)

Usually **PATH stripped** or login-shell clobber in ChatGPT Desktop — not missing binaries on disk (`/bin/zsh` exists).

1. Ensure `~/.codex/config.toml` has `shell_environment_policy.inherit = "all"` and explicit `PATH` / `SHELL` (see `.codex/CODEX.md`).
2. Set `[shell] default_login = false` when supported by the installed Codex build.
3. Quit ChatGPT completely and reopen the **trusted** Opsly folder.
4. Prefer worktrees under `intcloudsysops/.worktrees/*` created with `git worktree add`.

Reference: `docs/04-infrastructure/MACOS-LOCAL-AI-AUTOMATION.md`.

---

## Enlaces relacionados

- [[README|.]]
- [[README|Inicio]]
