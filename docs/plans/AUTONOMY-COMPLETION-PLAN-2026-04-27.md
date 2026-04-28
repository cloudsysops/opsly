# Autonomy Completion Plan

Date: 2026-04-27  
Scope: Complete the current autonomy implementation safely and incrementally.  
Owner: Opsly platform + autonomous runtime.

## Mission

Move Opsly from partial autonomy to stable autonomous operation with measurable outcomes, without breaking production behavior.

## Success criteria (global)

1. End-to-end autonomous flow runs successfully 3 times in a row:
   - research -> sandbox -> status -> report.
2. Human interventions are reduced to <= 3 per week.
3. Sandbox success rate is >= 85%.
4. Core runtime remains stable during autonomy activation.

---

## Phase 0 — Hygiene and baseline (Day 0)

### Goal

Start from a clean, measurable state.

### Tasks

- Clean local non-versioned artifacts (`__pycache__`, temp workspaces, ad-hoc logs).
- Run baseline checks:
  - `npm run type-check`
  - key test suites for touched workspaces.
- Normalize `runtime/context/system_state.json` KPI keys:
  - `autonomy_success_rate`
  - `human_interventions_week`
  - `sandbox_success_rate`
  - `gateway_availability`

### Owner

- Platform maintainer + autonomous scheduler.

### Exit criteria

- Baseline checks green.
- KPI snapshot committed to runtime state context.

---

## Phase 1 — Operational blockers closure (Day 0-2)

### Goal

Recover full end-to-end autonomous execution.

### Tasks

- Restore and validate local `llm-gateway` availability (`/v1/search`).
- Run `research-run` with artifacts and confirm report generation.
- Enqueue and validate `sandbox_execution` job and status retrieval.
- Execute one HRP simulated blockage + resolve cycle.

### Owner

- Orchestrator/runtime team.

### Exit criteria

- 3 consecutive successful E2E runs.
- No critical blocker open for gateway/sandbox/hrp path.

**Status 2026-04-27:** Fase 1 cerrada en repo: 3x `python3 -m tools.cli.main research-run` con `LLM_GATEWAY` local operativo; informes en `docs/research/research-9d271e20-1a44-44b5-a862-83299a4929b9.md` y dos más (mismo prefijo 2fccc968 / e7714857). `apps/orchestrator/src/index.ts` integra `SandboxWorker` y `OpslyCortex` (flag `OPSLY_CORTEX_ENABLED`). E2E sandbox+job requiere orchestrator en marcha (no bloqueante para cierre de investigación).

---

## Phase 2 — Cortex activation in safe mode (Day 2-4)

### Goal

Enable strategic proactivity with feature flags and low risk.

### Tasks

- Enable:
  - `OPSLY_CORTEX_ENABLED=true`
  - conservative intervals (`OPSLY_CORTEX_INTERVAL_MINUTES=15` or higher).
- Validate Cortex loop emits safe intents only.
- Integrate strategic session output into actionable backlog.
- Connect GoalGenerator outputs to enqueuable initiatives.

### Owner

- Autonomous runtime + planner logic.

### Exit criteria

- Cortex runs for 48h without instability.
- Strategy cycle produces valid backlog entries.

---

## Phase 3 — Economic and growth agency (Week 1)

### Goal

Turn autonomy into measurable business value.

### Tasks

- Operationalize `opsly-economist` weekly loop:
  - top cost drivers,
  - low-risk optimizations,
  - expected savings + risk notes.
- Start growth cadence:
  - one asset/week,
  - one outreach experiment/week.
- Add funnel tracking baseline:
  - visit -> signup -> activation -> paid.

### Owner

- Growth agent + economist skill + platform analytics.

### Exit criteria

- First weekly economic report delivered.
- At least one growth experiment with measurable results.

---

## Phase 4 — Controlled self-optimization (Week 2)

### Goal

Allow self-improvement with strict controls.

### Tasks

- Activate `OPSLY_META_OPTIMIZER_ENABLED=true` only in controlled environment.
- Keep optimize-test-apply sequence:
  - candidate prompt,
  - sandbox validation,
  - minimum +10% improvement threshold.
- Require rollback path for every auto-update.

### Owner

- Meta-optimizer + security guardrails.

### Exit criteria

- At least one validated improvement applied with evidence.
- No regression introduced by autonomous prompt updates.

---

## Phase 5 — Governance and release discipline (Week 2-3)

### Goal

Make autonomy sustainable and auditable.

### Tasks

- Keep PRs small by capability.
- Update `AGENTS.md` after each major checkpoint.
- Keep ADR alignment updated (SAFE-AEF + CLI consolidation).
- Define weekly go/no-go review for broader production autonomy.

### Owner

- Platform governance + operations.

### Exit criteria

- Weekly checklist completed.
- One full autonomous weekly cycle closed with >= 80% planned tasks completed.

---

## Priority backlog (strict order)

1. Stabilize `llm-gateway` local and `/v1/search`.
2. Validate E2E autonomous flow (`research-run` + sandbox + status + report).
3. Enable Cortex safely and monitor.
4. Wire GoalGenerator strategic output to backlog.
5. Close HRP loop with SLA tracking.
6. Add autonomy KPI dashboard/report.
7. Roll out meta-optimizer in gated mode.
8. Consolidate weekly growth + economics cadence.

---

## Session checklist (copy/paste)

- [ ] Pull latest main (`git pull --ff-only`).
- [ ] Run baseline checks for touched scope.
- [ ] Execute one autonomy E2E flow and collect evidence.
- [ ] Update runtime KPIs in `system_state`.
- [ ] Update `AGENTS.md` with progress/blockers.
- [ ] Commit focused changes (no local artifacts).

---

## Guardrails

- No destructive prod changes without explicit approval.
- Any recurring cost > 10 USD/month requires human approval.
- Sandbox defaults to isolated network unless explicitly justified.
- All autonomous changes must remain reversible and traceable.
