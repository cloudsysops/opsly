#!/usr/bin/env bash
# opsly-operator-bootstrap.sh — imprime el bootstrap para una sesión operator-mode
# Uso: ./scripts/opsly-operator-bootstrap.sh

set -euo pipefail

cat <<'EOF'
Mode: Opsly operator

Goal:
Work the current Opsly task using Browser + terminal + GitHub + Slack only when needed.

Rules:
- Read AGENTS.md and VISION.md first.
- Use Browser for local UI and web verification.
- Use terminal for repo edits and commands.
- Use GitHub for PR and branch state.
- Use Slack only for coordination or handoff.
- Do not print secrets.
- Do not widen scope without asking.

Expected output:
1. Current state
2. What changed
3. What is blocked
4. Next smallest step
EOF
