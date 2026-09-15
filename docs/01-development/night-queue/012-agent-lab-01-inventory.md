---
id: agent-lab-01-inventory-012
status: done
owner: opsly-night-agent
created: 2026-09-11
requires_pr: true
agent_hint: cursor
reviewer_hint: codex
phase: 1
canon: docs/design/OPSLY-AGENT-LAB.md
---

# Agent Lab 01 — Inventory only (no new orchestrator)

## Mission slice

Map existing Opsly components to the Agent Lab design. **Do not implement** trust promotion, tournaments, or Moon UI in this job.

Read first: `docs/design/OPSLY-AGENT-LAB.md`

## Do

1. Confirm reuse table in the design doc against the repo (paths that exist / missing / duplicate risk).
2. List where a **single job registry** should live (extend `lib/agent-task-core` vs `lib/ai-board` vs BullMQ job metadata) — recommend one, with rationale.
3. List gaps only (what is missing for trust levels, experience records, prompt versions).
4. Propose phase order for night-queue files `013+` (held until this is `done`).
5. Leave «Respuesta agente» with: `ARCHITECTURE_MAP`, `JOB_REGISTRY_RECOMMENDATION`, `GAPS`, `NEXT_PHASE_FILE`.

## Do not

- Create a second orchestrator, MCP, or parallel queue product.
- Touch Peskids prod / Doppler secrets / force-push.
- Start video/highlight pilots yet.
- Silently mutate production prompts.

## Acceptance

- [x] Design reuse table verified with real paths
- [x] One recommended persistence surface for the job registry
- [x] Gaps listed without implementing them
- [x] PR or branch with doc-only updates if the design map needed corrections

---

## Respuesta agente (2026-09-12T10:35:00Z)

- **Estado:** hecho
- **Job:** agent-lab-01-inventory-012
- **Agente:** cursor
- **Rol:** executor
- **Rama / PR:** `docs/agent-lab-012-inventory` (PR al abrir)

### ARCHITECTURE_MAP

All rows in the design reuse table verified on disk (orchestrator, ai-board, agent-task-core, types envelope, external-agent-registry, agent-services/capabilities, pc-gamer scripts+schedule, content-studio, night-queue+dispatch, agent-learning, capability owners, LLM gateway, ownership note, background scheduler scripts). Mission Control scorecards for Lab remain a soft gap (UI exists; Lab metrics not wired).

Duplicate risk: do **not** reintroduce `lib/agent-job-registry` or `lib/agent-lab-evidence`.

### JOB_REGISTRY_RECOMMENDATION

**Extend `lib/agent-task-core` + `AgentTaskEnvelopeV1`** as the single task identity/lifecycle surface. Runtime status stays orchestrator BullMQ + Redis `JobState` (ADR-048). `lib/ai-board` stays domain mapping only. `lib/agent-learning` attaches evidence/trust by `request_id` and must not create tasks.

### GAPS

Trust auto-promotion thresholds; eval/export pipeline; prompt versioning; MC Lab scorecards wiring; durable Mac orch LaunchAgent script in git; night-queue status parser treating partial responses as `unknown`.

### NEXT_PHASE_FILE

`docs/01-development/night-queue/013-agent-lab-02-registry.md` — unhold to `pending` after this lands.

- **Cómo verificar:** `test -d lib/agent-learning && test -f docs/design/OPSLY-AGENT-LAB.md`; read updated reuse/gaps sections; `node scripts/ops/night-queue-status.mjs`
