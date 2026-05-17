# Opsly Operator Mode

Use this runbook when you want a single working loop across:

- Browser for local UIs, GitHub, Slack, and other web surfaces
- Terminal for the Opsly repo and shell tools
- GitHub for branch, PR, and review state
- Slack for coordination and human handoff

## Objective

Keep the session narrow and deterministic:

1. Inspect the current repo state first.
2. Use Browser for UI verification and web actions.
3. Use terminal for file edits, tests, and git.
4. Use GitHub for PRs and review metadata.
5. Use Slack only when coordination is needed.

## Operating Rules

- Do not expose secrets, tokens, or private endpoints.
- Do not invent a second source of truth.
- Prefer existing repo scripts and runbooks.
- Keep changes scoped to one task at a time.
- Validate before handoff: type-check, smoke test, or targeted check.

## Session Bootstrap

Paste this at the start of a new operator session:

```text
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
```

## Practical Flow

- Open the repo in the terminal.
- Open the local app or target web surface in Browser.
- Make the smallest safe change.
- Validate the change.
- Commit only when the task is complete.

