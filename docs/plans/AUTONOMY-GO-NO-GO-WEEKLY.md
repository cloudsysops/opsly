# Autonomy Weekly Go/No-Go Checklist

## Scope

This checklist decides whether Opsly can increase autonomous execution scope for the next week.

## Go Criteria (all required)

- `autonomy_success_rate >= 0.90` for the last 7 days.
- `sandbox_success_rate >= 0.90` for the last 7 days.
- `gateway_availability >= 0.99` for the last 7 days.
- `human_interventions_week <= 2`.
- No unresolved `critical` incidents in orchestrator or llm-gateway.
- At least one successful daily `goal_backlog_sync` event per day.

## No-Go Triggers (any one blocks expansion)

- Two or more failed autonomous runs in a rolling 24h window.
- Any failed `sandbox_execution` caused by policy/permissions drift.
- Missing `ORCHESTRATOR_LLM_GATEWAY_URL` or Cortex disabled unintentionally.
- Redis connectivity/auth warnings during smoke run.
- Repeated fallback-only behavior from Cortex analysis for more than 24h.

## Weekly Decision Procedure

1. Capture KPIs from `runtime/context/system_state.json`.
2. Run `npm run test --workspace=@intcloudsysops/orchestrator`.
3. Run `npm run type-check`.
4. Run a bounded smoke:
   - `ITERATIONS=1 ENABLE_HERMES_TICK=true ENABLE_WORKER_SMOKE=true ./scripts/agents-autopilot.sh`
5. Record decision:
   - `GO` if all criteria pass and no no-go trigger appears.
   - `NO-GO` otherwise, with remediation tasks for the next cycle.

## Remediation Defaults

- Keep `OPSLY_CORTEX_INTERVAL_MINUTES=15` while stabilizing.
- Keep expansion scope limited to existing `intent_dispatch` and `sandbox_execution` flow.
- Prioritize Redis and llm-gateway reliability before new autonomous surfaces.

## Latest Weekly Check

- Date: `2026-04-28`
- Result: `GO (controlled scope)`
- Evidence:
  - `npm run type-check` passed.
  - `npm run test --workspace=@intcloudsysops/orchestrator` passed (137 tests).
  - `DRY_RUN=true ITERATIONS=1 ENABLE_HERMES_TICK=true ENABLE_WORKER_SMOKE=true ./scripts/agents-autopilot.sh` passed.
- Constraints kept:
  - `search_mode` remains `degraded` until `TAVILY_API_KEY` is available.
