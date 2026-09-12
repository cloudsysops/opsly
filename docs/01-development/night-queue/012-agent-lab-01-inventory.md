---
id: agent-lab-01-inventory-012
status: pending
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

- [ ] Design reuse table verified with real paths
- [ ] One recommended persistence surface for the job registry
- [ ] Gaps listed without implementing them
- [ ] PR or branch with doc-only updates if the design map needed corrections
