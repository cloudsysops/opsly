---
status: draft
owner: operations
last_review: 2026-09-12
type: design
tags:
  - opsly/agents
  - opsly/agent-lab
---

# Opsly Agent Lab — Supervisor → Worker → Review → Learn

**Purpose:** agents that become *measurably* better — not more agents.

**Hard rule:** do **not** create another orchestrator. Extend OpenClaw + BullMQ + existing registries.

## Hard rule: extend canonical task path

```text
AI Board → AgentTaskEnvelopeV1 → agent-task-core → external-agent-registry
  → orchestrator/BullMQ → worker → result → agent-learning (evidence/trust)
```

See `docs/design/PR-1185-ARCHITECTURE-RECONCILIATION.md` and `config/agent-capability-owners.json`.  
**Forbidden:** `lib/agent-job-registry` as a second task store (superseded by agent-learning).

## Activation (how prompts reach agents on a schedule)

| Mechanism | Interval | What it does | Use for Agent Lab |
|-----------|----------|--------------|-------------------|
| `scripts/ops/install-night-agent-launchd.sh` → `com.opsly.prompt-queue-opencode` | 10 min | Seeds `docs/01-development/night-queue/` → `.cursor/prompts/queue/`, runs `dispatch-prompt-queue.sh` + local OpenCode watcher | **Primary** for Cursor/OpenCode implementation prompts |
| `docs/n8n-workflows/night-agent-queue.json` | n8n cron | HTTP to orchestrator (not `ACTIVE-PROMPT` shell) | Optional remote kick |
| `scripts/ops/overnight-autodispatch.sh` + LaunchAgent | 5 min | Respects `config/pc-gamer-schedule.json` | **GPU pilots** (video review / tournaments) only in `heavy`/`light` windows |
| `npm run opsly:local-prompt-watcher` | event | Queue → `POST /api/local/prompt-submit` → BullMQ `local-agents` | Dev / once |
| Cursor chat | manual | `@.cursor/prompts/queue/NNN-….md` | Ad-hoc |

**Do not** feed this Markdown into VPS `docs/ACTIVE-PROMPT.md` as shell (RCE risk).

**Install queue dispatcher (Mac):**

```bash
./scripts/ops/install-night-agent-launchd.sh --dry-run
./scripts/ops/install-night-agent-launchd.sh
# unload: ./scripts/ops/install-night-agent-launchd.sh --unload
```

Phased prompts live in `docs/01-development/night-queue/012-agent-lab-*.md` (seeded automatically). Only `status: pending` files are dispatched; later phases use `status: held` until the previous phase marks `done`.

## Reuse map (inventory first — no duplicates)

| Lab concept | Existing component | Path / notes | Verified 2026-09-12 |
|-------------|-------------------|--------------|---------------------|
| Control plane / jobs | OpenClaw Orchestrator + BullMQ | `apps/orchestrator` | ✅ |
| Supervisor BUILD→REVIEW | AI Board + Claude↔Codex skill | `lib/ai-board`, `skills/user/opsly-claude-codex-review` | ✅ |
| Task envelope / assign | agent-task-core | `lib/agent-task-core` (`envelope`, `assign`, `policy`) | ✅ |
| Task contract | `AgentTaskEnvelopeV1` | `packages/types/src/agent-task.ts` | ✅ |
| Agent endpoints | agent-services + capabilities | `config/agent-services.json`, `config/agent-capabilities.json` | ✅ |
| External agents | external-agent-registry | `lib/external-agent-registry` | ✅ |
| Local execute pool | ports 5001–5011 | Cursor/Claude/Codex/OpenCode/… | ✅ (via agent-services) |
| PC-gamer worker | Docker plane + heartbeat | `scripts/ops/pc-gamer-*.sh` | ✅ |
| Schedule / Mauro | pc-gamer-schedule | `config/pc-gamer-schedule.json` | ✅ |
| Independent content review | content-studio reviewer | `lib/content-studio` | ✅ |
| Prompt delivery | night-queue + dispatch | `docs/01-development/night-queue/`, `dispatch-prompt-queue.sh` | ✅ |
| Learning / evidence / trust | agent-learning | `lib/agent-learning` (+ `config/agent-capability-owners.json`) | ✅ |
| Ownership table | architecture note | `docs/00-architecture/AGENT-LAB-CAPABILITY-OWNERSHIP.md` | ✅ |
| Background scheduler | select/guard/preview | `scripts/ops/background-*.mjs`, `night-queue-status.mjs` | ✅ |
| Mission Control / Moon | existing UIs | extend scorecards — do not fork control plane | ⚠️ UI exists; Lab scorecards not wired |
| LLM | LLM Gateway + Ollama on gamer | never bypass OpenClaw for production path | ✅ `apps/llm-gateway` |

**Duplicate risks closed:** `lib/agent-job-registry` and `lib/agent-lab-evidence` must not land — learning is `@intcloudsysops/agent-learning` only.

## Job registry recommendation (inventory 012)

**Canonical persistence for task identity + lifecycle:** extend **`lib/agent-task-core` + `AgentTaskEnvelopeV1`**, with runtime status in orchestrator Redis `JobState` / BullMQ (`ADR-048`).

| Surface | Role | Do not |
|---------|------|--------|
| `packages/types` + `lib/agent-task-core` | Single job/task contract, policy, assign, enqueue client | Second registry package |
| `apps/orchestrator` BullMQ + Redis JobState | Runtime queue + short-TTL status | Parallel queue product |
| `lib/ai-board` | Domain signal → board job mapping (Peskids-scoped patterns) | General Agent Lab job store |
| `lib/agent-learning` | Evidence / review / trust / scorecards keyed by `request_id` | Task creation |

## Gaps

1. ~~**Trust promotion/demotion policy**~~ — **done in 013** (`DEFAULT_PROMOTION_POLICIES` + demotion floors; no auto `autonomous_low_risk`).
2. ~~**Eval datasets (in-memory)**~~ — **done in 013** (`registerEvalCase` / `recordEvalResult`). Continuous durable export still open.
3. ~~**Prompt / model performance**~~ — **done in 013** (`getPromptPerformance` / `getModelPerformance`).
4. **Mission Control scorecards UI** — Lab metrics not yet a first-class MC panel.
5. ~~**Mac durable orch LaunchAgent script**~~ — **done in 012** (`scripts/ops/start-orchestrator-mac.sh`).
6. ~~**night-queue status parser**~~ — **mitigated in 013** (`resolveEffectiveStatus` prefers frontmatter `done` over stale metadata `unknown`).

## Phase order after 012

| File | When |
|------|------|
| `013-agent-lab-02-registry.md` | **Done** 2026-09-12 — learning layer extensions |
| later night-queue Agent Lab phases | After 013 green + Codex review |
| Video / highlight pilots | Only after registry/learning MVP; respect PC-gamer schedule |

## Supervisor roles (canonical)

| Role | Agent | Owns |
|------|-------|------|
| CLAUDE | architect | architecture, planning, context, product reasoning |
| CURSOR | executor | implementation, repo integration, repairs |
| CODEX | reviewer | independent review, tests, verification, security |

No two supervisors edit the same implementation simultaneously. Builder ≠ reviewer when practical.

## Job registry (one)

All supervisors propose into **one** durable registry: **`AgentTaskEnvelopeV1` / `lib/agent-task-core`** (see inventory recommendation above). Runtime execution stays on orchestrator BullMQ; learning attaches via `lib/agent-learning` on `request_id`.

**Do not** invent a second queue product or `lib/agent-job-registry`.

Contract fields: `job_id`, `objective`, `source_signal`, `priority`, `risk`, `required_capabilities`, `candidate_agent`, `model`, `inputs`, `acceptance_criteria`, `tests`, `status`, `attempt`, `result`, `evidence`, `review`, `human_decision`.

## Trust levels

`OBSERVE` → `SHADOW` → `SUPERVISED` → `TRUSTED` → `AUTONOMOUS_LOW_RISK`

No agent starts autonomous. Promotion thresholds configurable; demotion automatic on critical failure / regression. No AI self-promotion around policy.

## Pilots (after inventory + registry)

1. **Video review agent** — 20 synthetic/historical tasks; compare models; no publish.
2. **Highlight selection** — compare qwen3:8b / 14b / llama3.2 on existing sessions.

Respect Mauro gaming windows: no heavy GPU during `gaming` mode.

## Definition of done (MVP)

See checklist in night-queue phase prompts and the original mission prompt. Gate: `AGENT_LAB_MVP_READY`.

## Related

- [[01-development/AGENT-PROMPT-QUEUE|Prompt queue]]
- [[runbooks/NIGHT-MERGE|Night merge / queue dispatcher]]
- [[runbooks/PC-GAMER-OVERNIGHT-AUTODISPATCH|Overnight autodispatch]]
- [[03-agents/CLAUDE-CODEX-MCP-BRIDGE|Claude↔Codex AI Board]]
