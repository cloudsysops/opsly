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
| Mac `docs/mauro-gameplay-pipeline-spec` | **DIRTY** | Spec/skill + untracked Capacitor/ICSO images. Do not implement here. |
| `/private/tmp/opsly-content-gaming-config` `feat/mauro-gameplay-session-pipeline` | **ACTIVE** | #1158 session MVP. pycache untracked only. |
| `origin/feat/content-gaming-channel-config` | **ACTIVE** | #1155 intake / watcher / audio-peak. |
| `/private/tmp/opsly-pc-gamer-stabilize` `fix/pc-gamer-compose-main` | **ACTIVE** | #1157 compose stabilize. |
| `/private/tmp/opsly-vendor-pointer` `docs/content-vendor-research` | **EXPERIMENTAL** | #1151 vendor pointer; clones stay outside repo. |
| `intcloudsysops-content-engine` `feat/content-engine-mvp` | **SUPERSEDED** | Scene-compose already on main as `lib/content-engine`. Behind remote. |
| `.claude/worktrees/mauro-gameplay-pipeline-impl` | **DIRTY** | Old QA-gate SHA + untracked `docs/content-drafts/`. Superceded by #1155 lineage. |
| `worktrees-tmp/content-pipeline-universe` | **UNKNOWN** | Remote branch gone. Docs-only leftover. |
| `docs/adr-content-engine-consolidation` | **ACTIVE** | #1131 ADR-058 proposal. |
| `fix/content-engine-safe-unification` | **EXPERIMENTAL** | #1132 ffmpeg probe delegate. Blocked by ADR-058. |
| Codex/game/franchise worktrees | **UNRELATED** | Do not mix with content pipeline. |

Open content PRs to stack, not squash: #1154 (night) → #1157 → #1155 → #1158.
Docs-only unification: this report + canonical doc + `config/content-capabilities.json`.
