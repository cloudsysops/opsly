# Goal: Opsly Agent Runtime Node (VPS)

**Status:** in_progress  
**Contract:** `docs/03-agents/OPSLY-RUNTIME-WORKER-CONTRACT.md`

## Done when

- [x] `lib/session-manager` (types, tmux, store, index)
- [x] Orchestrator internal `/internal/runtime/*` + `runtime_session` worker
- [x] API `GET/POST /api/runtime/*` (admin auth)
- [x] MCP runtime tools + permissions + audit
- [x] LLM Gateway `opsly:*` virtual model aliases
- [x] Admin Mission Control `/mission-control/runtime`
- [x] `npm run test --workspace=@intcloudsysops/session-manager`
- [x] `npm run type-check` verde en api + orchestrator + mcp + llm-gateway

## Verify locally

```bash
npm run type-check --workspace=@intcloudsysops/session-manager
npm run test --workspace=@intcloudsysops/session-manager
OPSLY_RUNTIME_DRY_RUN=true node scripts/opsly-runtime-smoke.mjs
```
