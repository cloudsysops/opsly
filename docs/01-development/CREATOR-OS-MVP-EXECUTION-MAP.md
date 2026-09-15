---
status: active
owner: product
last_review: 2026-09-12
---

# Creator OS — MVP Execution Map

Parent epic: #1341  
Portfolio map: #1352  
Product thesis: `../00-architecture/CREATOR-OS-PRODUCT-THESIS.md`

## Execution phases

### Phase A — Core contracts
- #1342 — EventEnvelopeV1 + normalized Event Bus
- #1343 — Local Bridge security + session auth

### Phase B — Live creator surface
- #1344 — Command Deck PWA + degraded mode
- #1345 — OBS adapter + scoped permissions
- #1346 — System telemetry module
- #1347 — Challenges + Community modules

### Phase C — Durable Moments
- #1348 — MomentScoreV1 + explainability + veto
- #1349 — Card Studio + Fair-Play provenance badge

### Phase D — Post-stream
- #1350 — Editor timeline + publishable Moment candidates

### Phase E — Validation
- #1351 — Real streamer 3-session validation

## Dependency graph

```text
#1342 Event Bus
   |
   +--> #1343 Local Bridge
   |       |
   |       +--> #1344 Command Deck
   |       +--> #1345 OBS
   |       +--> #1346 System
   |
   +--> #1347 Challenges/Community
            |
            +--> #1348 MomentScore
                    |
                    +--> #1349 Card Studio
                            |
                            +--> #1350 Editor
                                    |
                                    +--> #1351 validation
```

Parallel execution is allowed only after dependency contracts are frozen.

## Explicit MVP non-goals

- Opsly Arena full production;
- marketplace;
- paid influence;
- protected-game memory reading;
- anti-cheat workarounds;
- hidden opponent state;
- second publisher;
- second agent orchestrator;
- generic full video editor.

## Exit gate

Do not green-light full Opsly Arena production until #1351 has real-stream evidence and the Creator OS thesis is re-reviewed.
