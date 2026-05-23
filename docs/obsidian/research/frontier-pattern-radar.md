---
status: evergreen
owner: operations
last_review: 2026-05-22
type: claim
tags:
  - claim
  - verified
  - opsly/research
confidence: alta
related_sources:
  - obsidian/sources/frontier-pattern-sources.md
---

# Frontier Pattern Radar

> El cerebro de Opsly debe guardar patrones de dominios frontera para extraer
> formas reutilizables, no solo repos populares.

## Afirmación

Los repos con muchas estrellas en dominios frontera suelen repetir los mismos
patrones software: simulacion antes de ejecucion, telemetria visible,
separacion control/data plane, replay temporal, dashboards de estado y ciclos
de aprendizaje medibles.

## Radar por dominio

### Space / Rocket / Satellite

- Simulate first, build second.
- Separate mission control from payload execution.
- Treat telemetry as product input, not just logs.
- Use digital twins and deterministic replay before touching hardware.
- Prefer clear state transitions over hidden side effects.

### Navigation / Geospatial

- Keep state estimation explicit.
- Separate map, route, sensor, and control concerns.
- Design for fallback when a sensor or feed disappears.
- Make the UI a mission console, not just a map view.

### Marketing / Growth

- Measure activation, retention, referral, revenue.
- Keep experiments, feature flags, and session replay visible.
- Treat onboarding as a product loop, not a wizard.
- Make analytics self-serve for operators.

### Architecture / Platform

- Control plane vs data plane.
- Event catalog and service boundaries.
- Contract-first APIs and workflow visibility.
- Modular monolith until extraction is justified.
- Approval-first for destructive or external actions.

### Time / Replay / Debugging

- Snapshots, replay, audit, and lineage are first-class.
- Time travel is a software problem: versioned state plus deterministic inputs.
- Time-aware systems need rollback and forensic visibility.

### Black-hole style patterns

- Every sink needs observability.
- Dead letters, failed jobs, and lost actions must be surfaced.
- Never let a destructive action become a silent event horizon.
- Budget and retry loops need a kill switch.

## Pattern families to save

| Family | Save as | Where it belongs |
| --- | --- | --- |
| Simulation | claim + pattern | `docs/obsidian/research/` and `docs/brain/architecture/` |
| Telemetry | pattern | `docs/brain/workflows/` |
| Replay / snapshot | pattern + decision | `docs/obsidian/research/` and `docs/adr/` |
| Mission control | pattern | `docs/brain/dashboard.md` |
| Growth loop | pattern | `docs/blueprints/opsly-operational-blueprint/` |
| Temporal state | claim | `docs/obsidian/research/` |
| Sink-state defense | pattern | `docs/03-agents/` and `docs/runbooks/` |

## Evidence anchors

- OpenRocket and openMotor show the value of simulation before physical build.
- SatNOGS, BIRDS, and LOST show telemetry/ground-control/replay patterns.
- Cesium shows the importance of geospatial state and a strong visual control layer.
- PostHog and OpenReplay show product analytics plus session replay as operator tools.
- Appsmith and Next.js SaaS starters show how to package admin tooling and SaaS shells.
- Infisical shows security, secrets, and privileged access as a product surface.
- OpenHands, Nuclei, EventCatalog, and Axon show runtime, security, and event lineage patterns.

## What this does not do

- It does not merge all domains into one product.
- It does not replace `AGENT-STARTUP-PROMPT.md`.
- It does not mean every trend is worth implementing.

## Connections

- [[obsidian/TAXONOMY]]
- [[obsidian/sources/frontier-pattern-sources]]
- [[brain/agents/README]]
- [[brain/architecture/README]]
- [[brain/workflows/README]]

