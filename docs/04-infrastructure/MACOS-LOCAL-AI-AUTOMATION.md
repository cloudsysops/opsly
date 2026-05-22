---
status: canon
owner: operations
last_review: 2026-05-22
---

# macOS Local AI Automation Policy

Opsly agents may automate local developer tools through a constrained workspace and explicit allowlist.

## Workspace

```bash
mkdir -p ~/opsly-workspace
ln -s "<CLONE>" ~/opsly-workspace/opsly
```

Agents run from `~/opsly-workspace/opsly`. Override: `OPSLY_LOCAL_WORKSPACE` (must stay under `~/opsly-workspace/`).

## Terminals

| Terminal | Script | Config |
| --- | --- | --- |
| **Ghostty** (preferred on Mac) | `scripts/local-ghostty-open.sh` | `config/ghostty/config` → `./scripts/install-ghostty-config.sh` |
| iTerm2 | `scripts/local-iterm-open.sh` | AppleScript (Automation permission) |

```bash
./scripts/install-ghostty-config.sh
scripts/local-ghostty-open.sh "tmux attach -t opsly-agents"
scripts/local-ghostty-agents.sh
scripts/local-app-open.sh ghostty
scripts/local-app-open.sh ghostty-agents
```

Claude Code in Ghostty: set `preferredNotifChannel` to `"ghostty"` in `~/.claude/settings.local.json` (see [terminal notifications](https://docs.claude.com/en/terminal-config#get-a-terminal-bell-or-notification)).

## Allowed apps

- Ghostty, iTerm2, Cursor, Visual Studio Code
- Docker / Colima
- Browser for localhost QA
- OBS / Ableton only when the task needs media tooling

Helpers:

```bash
scripts/local-app-open.sh cursor
scripts/local-app-open.sh docker
```

## macOS permissions (human only)

1. **Accessibility:** Cursor, Codex (Desktop), **Ghostty**, iTerm2, VS Code. Optional: Raycast, Hammerspoon.
2. **Automation / Apple Events:** on first `local-iterm-open.sh`, approve control of iTerm. Ghostty uses `open` + CLI args (usually no extra prompt).
3. **Input Monitoring:** only if paste/typing automation fails in the terminal.
4. **Screen Recording:** only for visual QA.
5. **Full Disk Access:** avoid; if required, Ghostty or Cursor only, still under `~/opsly-workspace`.

After changes: **Cmd+Q** affected apps, or `killall Ghostty` / `killall iTerm2`.

We do **not** ask for: sudo, Keychain, iCloud, root.

## Forbidden

- Automatic `sudo`
- Keychain or iCloud access
- Unrestricted Full Disk Access
- `POST /execute` on public interfaces without Bearer auth
- Writing outside `~/opsly-workspace` unless a human requests a specific path
