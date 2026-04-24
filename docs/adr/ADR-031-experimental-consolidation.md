# ADR-031: Consolidate Experimental Apps

**Status:** APPROVED (2026-04-24)  
**Decision:** Deprecate/archive experimental modules and keep only active runtime apps in top-level `apps/`.

## Context

- `context-builder-v2`: duplicates functionality already covered by `apps/context-builder`.
- `ai-evolution`: no active scope and not part of production path.
- `ingestion-service`: never promoted to production runtime.
- `mission-control`: scope not finalized and currently exploratory.
- `agents`: currently contains active `notebooklm`; it is not an empty placeholder.
- `ml`: remains active but intentionally minimal for now.

Impact of current sprawl: longer builds, unclear ownership, and higher maintenance overhead.

## Decision

### Immediate (Week of 2026-04-24)

1. Deprecate `apps/context-builder-v2` with `.deprecation.yml`.
2. Archive:
   - `apps/ai-evolution` -> `apps/experimental/ai-evolution-archive`
   - `apps/ingestion-service` -> `apps/experimental/ingestion-service-archive`
   - `apps/mission-control` -> `apps/experimental/mission-control-archive`
3. Keep `apps/agents/notebooklm` active (it is used and not empty).
4. Add archive README notes for reactivation guidance.

### Future (Next 2 sprints)

1. Decide resurrection/deletion policy for each archived app.
2. If no reactivation demand, remove archived modules after review window.
3. Optionally convert `apps/experimental` into a documented policy gate.

## Consequences

✅ Reduced top-level app sprawl  
✅ Clear separation between active and archived modules  
✅ Lower cognitive load during onboarding and maintenance  
⚠️ Historical modules remain available but out of active workspace path

## Migration Path

```bash
git mv apps/ai-evolution apps/experimental/ai-evolution-archive
git mv apps/ingestion-service apps/experimental/ingestion-service-archive
git mv apps/mission-control apps/experimental/mission-control-archive
```

## Notes

`apps/agents` was not deleted in this ADR because `apps/agents/notebooklm` is an active module.
