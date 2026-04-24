# ADR-033: Documentation canonicalization

**Status:** ACCEPTED (2026-04-24)  
**Decision:** Single human-edited canon at repo root (`VISION.md`, `ROADMAP.md`, `AGENTS.md`, `SPRINT-TRACKER.md`) plus `docs/README.md` as wiki index; machine views from `docs/implementation/status.yaml` only under `docs/generated/*.auto.md` (with `do_not_edit: true`); deprecated Markdown snapshots under `docs/history/plans/`.

## Context

- Multiple overlapping “status” Markdown files risked drift and CI grep false positives.
- Generators must not overwrite human sprint narrative (`SPRINT-TRACKER.md`).

## Decision

1. Generators write only to `docs/generated/implementation-progress.auto.md` and `docs/generated/sprint-status.auto.md`.
2. Legacy root copies `docs/IMPLEMENTATION-STATUS.md` and `docs/SPRINT-TRACKING.md` are archived under `docs/history/plans/`.
3. Governance workflow `.github/workflows/docs-governance.yml` enforces absence of forbidden duplicate filenames (except allowed paths) and validates canon / generated markers.

## Consequences

- Clear split: human canon vs generated views vs history.
- CI may require follow-up tuning (exclusions, `status: canon` on canon files) so checks stay green.

## References

- `docs/generated/README.md`
- `scripts/sync-docs.js`, `scripts/generate-sprint-tracking.js`, `scripts/test-sync-docs.sh`

## Note on divergent worktrees

Worktrees under `.claude/worktrees/` (e.g., `crazy-carson`) may contain pre-ADR-033 copies of scripts and docs. These are intentionally not synchronized with `main`. If a worktree is resurrected, re-apply ADR-033 in that context.
