# CLI Migration Checklist (`tools/cli` -> `apps/cli`)

Status: not started  
Owner: platform  
Policy reference: `docs/adr/ADR-036-cli-consolidation-tools-cli-first.md`

## Phase 0 — Keep current CLI healthy

- [ ] Confirm critical commands in `tools/cli` are documented (`research-run`, bridge/status, reporting).
- [ ] Add/verify tests for critical command paths and failure modes.
- [ ] Ensure no new command is added in a second location.

## Phase 1 — Readiness gate

- [ ] Define command contract doc (arguments, output schema, exit codes).
- [ ] Define release strategy (versioning, changelog, ownership).
- [ ] Add CI checks dedicated to CLI contract and regression.
- [ ] Run security review for command execution and HTTP bridge usage.
- [ ] Confirm migration does not increase recurring costs without approval.

## Phase 2 — Controlled migration

- [ ] Create `apps/cli` workspace with the same command surface.
- [ ] Implement delegating wrapper in `tools/cli` (temporary compatibility layer).
- [ ] Validate backward compatibility with existing scripts and automations.
- [ ] Update runbooks/docs (`AGENTS.md`, ops docs, scheduler hooks) to new entrypoint.

## Phase 3 — Cutover and cleanup

- [ ] Mark `tools/cli` wrapper as deprecated with target removal date.
- [ ] Observe one full cycle of autonomous operations without regressions.
- [ ] Remove wrapper only after all callers move to `apps/cli`.
- [ ] Update ADR status and final architecture docs.
