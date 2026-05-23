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
- **Structured** OBS / OSC via `tools/live-automation/` (`dispatch.py`, `osc_send.py`) using `scripts/opsly-live-obs.sh` / `scripts/opsly-live-osc.sh` — never raw LLM mouse

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

Reference: `docs/04-infrastructure/MACOS-LOCAL-AI-AUTOMATION.md`.
