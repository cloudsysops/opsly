---
id: upstream-hermes-openclaw-integration-026
status: pending
owner: opsly-agent-supervisor
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# Opsly — Adopt upstream Hermes Agent + OpenClaw without name collisions

## Mission

Integrate the real upstream agent products as external workers while removing naming ambiguity with Opsly's internal orchestration code.

External products:
- Nous Research Hermes Agent / Hermes CLI
- OpenClaw upstream CLI/gateway/runtime

Do NOT reimplement either product inside Opsly.

Reuse:
- existing Opsly Orchestrator
- BullMQ / AgentTask
- external-agent registry
- MCP server
- existing local agent HTTP bridges
- compute worker routing
- Tailscale/private execution
- trusted task / node security model

## Current collision to resolve

Today the repo contains:

1. `hermes-cli` in `config/external-agent-registry.json` — intended to mean the external Hermes binary.
2. `apps/orchestrator/src/hermes/**` — an internal Opsly task lifecycle/router module, not upstream Hermes Agent.
3. `apps/orchestrator/src/openclaw/**` — internal Opsly policy/control/router modules, not the upstream OpenClaw binary.
4. BullMQ queue/history names containing `openclaw`.

These names make it too easy for operators and agents to confuse internal Opsly code with external upstream products.

## Canonical naming target

Use these semantic names going forward:

### External upstream products
- `hermes-agent` = Nous Research Hermes Agent binary/runtime
- `openclaw-cli` = upstream OpenClaw binary/gateway/runtime

### Internal Opsly modules
- current `apps/orchestrator/src/hermes/**` => **Opsly Task Coordinator**
  - preferred code namespace: `task-coordinator`
  - preferred class name: `OpslyTaskCoordinator`
- current `apps/orchestrator/src/openclaw/**` => **Opsly Agent Control Layer**
  - preferred code namespace: `agent-control`
  - preferred controller name: `runAgentControlLayer`

Legacy queue/table/env names may remain temporarily for compatibility if a safe rename would require migration.

Do not rename DB tables, Redis keys, queues, env vars, or public APIs in one shot.

## Required work

### A. Inventory + compatibility map

Produce a complete map of all references to:
- internal Hermes namespace/classes/env vars/tables/Redis keys/metrics
- internal OpenClaw namespace/classes/queues/env vars/routes
- external `hermes-cli`
- upstream OpenClaw CLI/gateway invocations

Classify each as:
- external upstream product
- internal Opsly semantic code
- legacy persisted identifier
- public API/contract
- safe-to-rename now
- compatibility alias required
- migration required

### B. Introduce canonical internal names safely

Prefer additive adapters/aliases first.

Goal:
- new code and docs stop calling Opsly's internal router "Hermes" or "OpenClaw" when referring to internal semantics;
- existing runtime remains compatible;
- no destructive database/queue migration in this PR.

Example migration pattern:
- add `apps/orchestrator/src/task-coordinator/**` facade around existing internal Hermes implementation;
- add `apps/orchestrator/src/agent-control/**` facade around existing internal OpenClaw control layer;
- mark old imports as compatibility/legacy;
- migrate call sites incrementally.

If a facade adds pointless duplication, propose the smallest better alternative and document it.

### C. External Hermes Agent adapter

Treat upstream Hermes Agent as an external binary worker.

Required:
- registry identity clearly says external/upstream;
- executable health/version check;
- bridge configuration;
- no write access by default;
- capabilities initially limited to planning, routing, research, task decomposition, review;
- no production deploy, DB mutation, secret enumeration, or direct main write.

Do not confuse this with internal Opsly Task Coordinator.

### D. External OpenClaw adapter

Treat upstream OpenClaw as an external runtime/worker, not the name of Opsly's own control layer.

Required:
- explicit external registry/runtime identity;
- health/version detection;
- support local model endpoint on PC Gamer where configured;
- capability-scoped execution;
- no release authority on PC Gamer;
- no production DB or unscoped secret access.

Do not replace Opsly Orchestrator with OpenClaw.

### E. Model/backend routing

Support hybrid routing:

```text
Opsly Orchestrator
  -> low-risk/local-capable
       -> OpenClaw/Hermes using PC-Gamer local models when available
  -> high-risk/high-complexity
       -> Claude/Codex/Cursor/external cloud model
```

Local-first is a routing preference, not a security bypass.

Escalate to cloud/high-capability reviewer for:
- security-sensitive changes
- Peskids/shared production blast radius
- schema/database changes
- low confidence
- repeated local failure
- reviewer disagreement

### F. PC Gamer

Reuse `pc-gamer-openclaw-01` as compute worker.

Allowed initially:
- local inference
- embeddings
- GPU compute
- render/video/image jobs
- low-risk analysis

Forbidden:
- release authority
- direct main write
- production database
- tenant PII by default
- unscoped secrets
- production deploy

### G. Documentation

Update terminology so every occurrence is unambiguous:

- "Hermes Agent" / "Hermes CLI" = upstream Nous product
- "Opsly Task Coordinator" = internal legacy Hermes module
- "OpenClaw CLI/runtime" = upstream OpenClaw product
- "Opsly Agent Control Layer" = internal legacy OpenClaw module
- "Opsly Orchestrator" = BullMQ control plane

Do not describe upstream binaries as already installed/running unless runtime evidence proves it.

## Required tests

1. Internal task coordinator still routes existing test tasks.
2. Internal agent control layer preserves current contracts.
3. External Hermes worker missing => fail closed / unavailable, not fake success.
4. External OpenClaw worker missing => fail closed / unavailable.
5. External Hermes cannot request write/deploy capability by default.
6. PC Gamer external OpenClaw cannot obtain release authority.
7. Local model unavailable => explicit fallback/escalation, not silent task loss.
8. Existing legacy queue/table identifiers remain compatible.
9. No duplicate orchestrator or duplicate MCP server introduced.
10. No secrets committed/logged.

## PR strategy

Prefer separate focused implementation PRs:

PR A — terminology + compatibility map + additive internal canonical aliases/facades

PR B — upstream Hermes Agent external adapter + health/version + policy

PR C — upstream OpenClaw external adapter + PC-Gamer/local-model routing + policy

Do not mix destructive persisted-identifier migrations into these PRs.

Builder != reviewer.

No auto-merge.
No production deploy.
No Peskids runtime changes unless explicitly reviewed under the Peskids change-window policy.

## Final report

```
UPSTREAM_AGENT_INTEGRATION_RESULT

INTERNAL_HERMES_CANONICAL_NAME:
INTERNAL_OPENCLAW_CANONICAL_NAME:
LEGACY_IDENTIFIERS_PRESERVED:
HERMES_UPSTREAM_ADAPTER:
OPENCLAW_UPSTREAM_ADAPTER:
PC_GAMER_LOCAL_MODEL_ROUTE:
CLOUD_ESCALATION_POLICY:
FILES_CHANGED:
TESTS:
PRS:
INDEPENDENT_REVIEW:
BLOCKERS:
NEXT_ACTION:
```
