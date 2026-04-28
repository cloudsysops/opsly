# Autonomous Execution Plan (24h)

Date: 2026-04-27
Owner: Opsly Autonomous Runtime
Scope: Incremental activation of integral autonomy with safety-first controls.

## 1) Current status checkpoint

- Phase 1 research command executed with active CLI (`python3 -m tools.cli.main research-run`).
- LLM Gateway search endpoint is currently unavailable from local runtime (`connection refused`).
- Report generated at `docs/research/research-778df65a-fe43-4962-9645-fc08dfa83ec4.md`.
- Artifact bundle generated at `docs/research/artifacts/778df65a-fe43-4962-9645-fc08dfa83ec4/`.

## 2) Prioritized gaps (next 24h)

### Critical

1. Restore `llm-gateway` availability for `/v1/search`.
2. Verify orchestrator internal endpoints for autonomous flow:
   - `POST /internal/enqueue-sandbox`
   - `GET /internal/job/:jobId`
3. Ensure daily autonomous reporting pipeline can run end-to-end.

### Important

1. Validate Help Request Protocol (HRP) with simulated blockage.
2. Add scheduler/bootstrap docs for daily cycle and weekly growth loop.
3. Run smoke tests for `research-run` with and without sandbox enqueue.

### Opportunity

1. Start Growth Loop with one niche content cycle (already scaffolded).
2. Define weekly KPI update path in `runtime/context/system_state.json`.

## 3) Execution plan (T+24h)

## Block A — Runtime recovery (T+0h to T+4h)

- **Task A1:** Start/validate `llm-gateway` service and confirm `/v1/search` health.
- **Task A2:** Run `research-run` again with search online and archive report.
- **Task A3:** Trigger one `sandbox_execution` job from CLI bridge and confirm status retrieval.

Success criteria:
- Search responds `200` and returns structured results.
- At least one sandbox job completes with deterministic log output.

## Block B — Autonomous operations hardening (T+4h to T+12h)

- **Task B1:** Execute HRP dry-run (create + resolve help request).
- **Task B2:** Validate report generation script + Discord notify script in dry-run-compatible mode.
- **Task B3:** Add or verify daily scheduler install path (`cron` or `systemd timer` runbook-backed).

Success criteria:
- Help request is created in `context/help-requests/` and resolved successfully.
- Daily report can be generated without manual edits.

## Block C — First low-risk auto-generated PR (T+12h to T+20h)

- **Task C1:** Open docs-only PR candidate:
  - activation runbook updates,
  - operations checklist updates,
  - known blockers and rollback notes.
- **Task C2:** Link evidence artifacts from `docs/research/`.

Success criteria:
- PR is reviewable, no runtime changes, passes checks.

## Block D — Learning and KPI update (T+20h to T+24h)

- **Task D1:** Update `runtime/context/system_state.json` autonomy counters.
- **Task D2:** Append lessons learned to `docs/reports/`.
- **Task D3:** Publish daily summary to Discord.

Success criteria:
- KPI snapshot updated with today run metadata.
- Report published with blockers + next actions.

## 4) Agent responsibility map

- **Planner Agent:** prioritize backlog and sequence blocks.
- **Research Agent:** run `research-run` and curate artifacts.
- **Executor Agent:** sandbox tests and runtime commands.
- **Security Agent:** validate no privileged/unsafe execution path is introduced.
- **Notifier Agent:** daily report and escalation messages.

## 5) Risk controls

- No production-destructive command without explicit human approval.
- Sandbox defaults to no network unless task explicitly requires it.
- Any recurring cost activation > $10 requires approval.
- Keep all changes reversible and logged in docs + commit history.

## 6) Immediate next command set

```bash
# 1) recover and validate search runtime
curl -sf http://localhost:3010/health

# 2) rerun research once gateway is online
python3 -m tools.cli.main research-run \
  --query "que capacidades faltan en Opsly para ser completamente autonomo" \
  --depth 2 \
  --save-artifacts

# 3) trigger sandbox validation flow
python3 -m tools.cli.main research-run \
  --query "validar sandbox end-to-end en Opsly" \
  --depth 1 \
  --run-sandbox \
  --execute
```
