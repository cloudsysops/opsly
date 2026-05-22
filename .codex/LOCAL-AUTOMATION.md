---
status: local
owner: operations
last_review: 2026-05-22
---

# Local Automation Guardrails

Root: `~/opsly-workspace/opsly`.

Allowed:

- Ghostty: `scripts/install-ghostty-config.sh`, `scripts/local-ghostty-open.sh`
- iTerm2: `scripts/local-iterm-open.sh`
- Cursor/VS Code/Docker: `scripts/local-app-open.sh`
- Docker, Colima, tests, builds, tmux, localhost browser QA

Forbidden without human approval:

- `sudo`, Keychain/iCloud, writes outside `~/opsly-workspace`
- exposing `/execute` beyond localhost/Tailscale
- changing macOS Privacy & Security (human toggles TCC)

## Permissions checklist

1. **Accessibility:** Cursor, Codex, **Ghostty**, iTerm2, VS Code.
2. **Automation:** iTerm only when using `local-iterm-open.sh`.
3. **Input Monitoring / Screen Recording / Full Disk:** only if needed (see main doc).

Then Cmd+Q or `killall Ghostty`.

Reference: `docs/04-infrastructure/MACOS-LOCAL-AI-AUTOMATION.md`.
