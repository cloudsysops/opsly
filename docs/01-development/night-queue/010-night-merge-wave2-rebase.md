---
id: night-merge-wave2-010
status: held
hold_reason: held for isolated Mac engineering-loop E2E smoke; resume only after explicit review
owner: opsly-night-agent
created: 2026-09-09
requires_pr: true
---

# Wave 2 — rebase remaining PRs after #1154 is on main

Run **only** after `origin/main` contains the squash of #1154 (audit lockfile + night-merge Deploy dispatch). Confirm with:

```bash
git fetch origin
git log origin/main --oneline -5
```

If #1154 is still OPEN, stop. Discord: "wave2 blocked, wave1 not merged". Do not merge anything during `America/Bogota` 06:00–22:00.

## Do

Work in isolated worktrees (`/tmp/opsly-*`), never in a dirty Cursor tree.

1. Rebase onto `origin/main` (force-with-lease **only** on the feature branch, never `main`):
   - #1155 `feat/content-gaming-channel-config`
   - #1150 `feat/tailscale-key-hygiene`
   - #1151 `docs/content-vendor-research`
   - #1144 `fix/peskids-deploy-rollback`
   - #1146 `feat/pc-gamer-content-agent-plane`
   - #1147 `feat/pc-gamer-gpu-gate`
2. Wait until CI is green **except** `production-change-window` (ignored by night-merge).
3. Add label `night-merge` **only** to PRs that are MERGEABLE and audit-green. Do **not** relabel #1156 if it is still open (already inside #1154).
4. Discord a one-line status per PR (rebased / conflict / skipped).
5. Leave the «Respuesta agente» section below.

## Do not

- `git push origin main`, `--no-verify`, force to `main`
- Merge auto-fix / nightly-fix PRs
- Merge #1153 (already closed; false rollback)
- Apply Tailscale `--apply` until #1150 is on main
- Touch prod flags, Doppler secret *values*, or VPS UFW

Follow `docs/runbooks/NIGHT-MERGE.md` and `docs/01-development/AGENT-PROMPT-QUEUE.md`.
