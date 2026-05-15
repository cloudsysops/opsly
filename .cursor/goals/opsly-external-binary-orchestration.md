# Goal: Opsly external binary orchestration only

**Status:** done (2026-05-15)

## Principle

Opsly does not replace market agents. Opsly orchestrates them.

## Done when

- [x] `config/external-agent-registry.json` — canonical worker catalog
- [x] `@intcloudsysops/external-agent-registry` — load + intent routing
- [x] Orchestrator `resolveOpslyJobTypeForPrompt` on `POST /api/local/prompt-submit`
- [x] `GET /api/local/external-agents` + `/internal/external-agents/registry`
- [x] Unified `local-agents` worker passes `model` + `external_worker_id` to bridges
- [x] LLM Gateway `opsly:architect` alias
- [x] `node scripts/opsly-external-agents-smoke.mjs` OK

## Verify

```bash
npm run build --workspace=@intcloudsysops/external-agent-registry
npm run test --workspace=@intcloudsysops/external-agent-registry
node scripts/opsly-external-agents-smoke.mjs
npm run type-check --workspace=@intcloudsysops/orchestrator
```

## Live E2E (operator)

1. Start bridges: `npm run opsly:local-agent-pool` (or per-agent `opsly-agent-cli`)
2. Orchestrator with Redis + `local-agents` worker enabled
3. `curl -X POST …/api/local/prompt-submit` with `intent: architecture` → routes to `local_claude`
