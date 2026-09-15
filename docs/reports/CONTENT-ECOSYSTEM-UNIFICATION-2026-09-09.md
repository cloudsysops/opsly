---
status: evidence
owner: content
last_review: 2026-09-09
---

# Content ecosystem unification — worktree snapshot 2026-09-09

Companion to `docs/00-architecture/CONTENT-PIPELINE-CANONICAL.md`.
No worktrees were deleted or reset.

| Worktree / branch | Class | Notes |
| --- | --- | --- |
| `/private/tmp/opsly-content-canon` `docs/content-pipeline-canonical` | **ACTIVE** | #1159 this unification (docs + registry). Clean. |
| Mac checkout `docs/mauro-gameplay-pipeline-spec` | **DIRTY** | Capacitor/ICSO images + REFERENCE-IMAGES + transmedia spec. Do not implement here. Do not reset. |
| `/private/tmp/opsly-content-gaming-config` `feat/mauro-gameplay-session-pipeline` | **ACTIVE** | #1158 session MVP. Only `__pycache__` untracked. |
| `origin/feat/content-gaming-channel-config` | **ACTIVE** | #1155 intake / watcher / audio-peak. |
| `/private/tmp/opsly-pc-gamer-stabilize` `fix/pc-gamer-compose-main` | **ACTIVE** | #1157 compose stabilize. Clean. |
| `/private/tmp/opsly-vendor-pointer` `docs/content-vendor-research` | **EXPERIMENTAL** | #1151 vendor pointer; clones stay outside repo. |
| `intcloudsysops-content-engine` `feat/content-engine-mvp` | **SUPERSEDED** | Scene-compose already on `main` as `lib/content-engine`. |
| `.claude/worktrees/mauro-gameplay-pipeline-impl` | **DIRTY** | Old SHA + untracked `docs/content-drafts/`. Superseded by #1155 lineage. |
| `worktrees-tmp/content-pipeline-universe` | **UNKNOWN** | Remote branch gone. Docs leftover. Do not delete blindly. |
| `docs/adr-content-engine-consolidation` | **ACTIVE** | #1131 ADR-058. |
| `fix/content-engine-safe-unification` | **EXPERIMENTAL** | #1132 ffmpeg probe. Blocked by ADR-058. |
| Codex / game / franchise / peskids worktrees | **UNRELATED** | Security, night-merge, franchise, game portal. Do not mix. |

Open content PRs (do not squash): #1154 (night) → #1157 → #1155 → #1158.
Docs-only unification: #1159 (`CONTENT-PIPELINE-CANONICAL.md` + `config/content-capabilities.json`).
No worktrees deleted or reset in this loop.
