---
status: proposed
owner: architecture
last_review: 2026-09-11
type: architecture
tags:
  - opsly/architecture
  - opsly/agents
  - opsly/runtime
  - opsly/hermes
  - opsly/openclaw
---

# Opsly Agent Runtime Topology

## Purpose

Define where Opsly control-plane services, external agent runtimes, local models, and compute workers actually run.

The architecture is intentionally **hybrid**.

Not every agent gets its own container.

The isolation boundary is chosen by responsibility:

- control-plane services -> long-lived containers/services;
- external CLI agents -> host process, daemon, bridge, or dedicated container when useful;
- local model runtimes -> node-local service, usually close to the GPU;
- task state and policy -> Opsly control plane;
- production authority -> never delegated to an ephemeral compute node.

## Canonical topology

```text
                         PUBLIC GITHUB
                             |
                    trusted task / PR evidence
                             |
                             v
+------------------------------------------------------------------+
|                     OPSLY CONTROL PLANE                           |
|                    VPS / trusted server                          |
|                                                                  |
|  +-----------------------+       +----------------------------+  |
|  | Opsly Orchestrator    |<----->| Redis / BullMQ            |  |
|  | apps/orchestrator     |       | queues + locks + jobs     |  |
|  | container/service     |       +----------------------------+  |
|  +-----------+-----------+                                       |
|              |                                                   |
|              +-----> Opsly Agent Control Layer                   |
|              |       (legacy src/openclaw semantics)             |
|              |                                                   |
|              +-----> Opsly Task Coordinator                      |
|              |       (legacy src/hermes semantics)               |
|              |                                                   |
|              +-----> Opsly MCP server                            |
|              |                                                   |
|              +-----> policy / budget / tenant / audit            |
+--------------+---------------------------------------------------+
               |
       Tailscale / private authenticated paths
               |
       +-------+--------------------------+
       |                                  |
       v                                  v
+--------------------------+    +-------------------------------+
| MAC / ENGINEERING NODE   |    | PC GAMER / COMPUTE NODE      |
|                          |    |                               |
| git checkout             |    | Ollama / local models        |
| task dispatcher          |    | OpenClaw upstream runtime    |
| prompt watcher           |    | optional Hermes upstream     |
| agent HTTP bridges       |    | GPU / embeddings / ffmpeg    |
|                          |    |                               |
| Claude CLI               |    | BullMQ worker                |
| Codex CLI                |    | compute-worker capabilities  |
| Cursor/OpenCode          |    |                               |
| Hermes Agent upstream*   |    | NO release authority          |
| OpenClaw upstream*       |    | NO production DB             |
+-------------+------------+    +---------------+---------------+
              |                                 |
              +---------------+-----------------+
                              |
                              v
                    branch -> PR -> CI
                    -> independent review
                    -> human/controlled merge
```

`*` Upstream Hermes Agent / OpenClaw may run on Mac, PC Gamer, VPS, or a future node depending on capability and risk. Their installation location does not change the fact that Opsly remains the control plane.

## Container model

### Always container/service oriented

These should be durable platform services:

- Opsly Orchestrator;
- Redis/BullMQ;
- Opsly MCP server;
- API/LLM Gateway where used;
- observability stack;
- production tenant services.

These components own or protect state, policy, queues, routing, and audit.

### Usually host process or daemon

These are vendor/external CLIs and may run directly on the node:

- Claude CLI;
- Codex CLI;
- Cursor/OpenCode;
- Hermes Agent upstream;
- OpenClaw CLI/gateway.

Reasons:

- they are vendor binaries, not Opsly-owned services;
- some need access to a local git checkout;
- some need local credentials/session state;
- some are easiest to supervise with launchd/systemd/tmux;
- wrapping each binary in a container would add complexity without adding meaningful security by itself.

Opsly reaches these binaries through a narrow adapter/bridge.

### Container when useful

A vendor agent/runtime may be containerized when:

- it needs reproducible dependencies;
- it should have a restricted filesystem;
- it needs CPU/RAM limits;
- it is a disposable worker;
- it should be restarted independently;
- it runs continuously.

Containerization is an implementation choice, not the identity model.

A container does **not** make an untrusted agent trusted.

Auth, capability policy, task provenance, filesystem permissions, network egress, and secret scope still apply.

## External Hermes Agent

Canonical meaning:

**Hermes Agent** = upstream external agent runtime.

It is not the current `apps/orchestrator/src/hermes/**` module.

Opsly should integrate upstream Hermes through an adapter:

```text
AgentTask
  -> Opsly policy
  -> external-agent registry
  -> Hermes bridge/adapter
  -> Hermes Agent runtime
  -> selected model
  -> result/evidence
  -> Opsly audit/state
```

Initial capabilities:

- planning;
- task decomposition;
- research;
- routing suggestions;
- review.

Default forbidden:

- direct main write;
- production deploy;
- production DB mutation;
- unscoped secret enumeration.

## Internal legacy Hermes module

Current:

`apps/orchestrator/src/hermes/**`

Canonical semantic name going forward:

**Opsly Task Coordinator**.

It currently owns internal task lifecycle/state/routing behavior.

Persisted identifiers such as:

- `platform.hermes_*`;
- Redis key `hermes:heartbeat`;
- `HERMES_*` environment variables;

may remain during compatibility migration.

They should not be treated as proof that upstream Hermes Agent is running.

## External OpenClaw

Canonical meaning:

**OpenClaw CLI/runtime** = upstream external runtime.

It may run:

- directly on Mac;
- in WSL/Windows PC Gamer;
- in a dedicated container;
- on VPS/future worker node.

Opsly should treat it as an execution runtime/worker, not as the control plane.

Example:

```text
Opsly policy
   |
   +--> OpenClaw external runtime
            |
            +--> local Ollama model
            +--> cloud model
            +--> specialized skill/agent
```

## Internal legacy OpenClaw module

Current:

`apps/orchestrator/src/openclaw/**`

Canonical semantic name going forward:

**Opsly Agent Control Layer**.

It owns:

- routing rules;
- policy;
- capability control;
- governance;
- registry decisions;
- runtime event contracts.

It is not the upstream OpenClaw binary.

Legacy BullMQ queue names containing `openclaw` may remain until an explicit migration is justified.

## PC Gamer role

The PC Gamer is a replaceable compute/execution node.

Preferred workloads:

- Ollama inference;
- embeddings;
- GPU compute;
- ffmpeg/render;
- image/video generation;
- low-risk agent workloads;
- OpenClaw upstream runtime using local models.

It must not become the platform control plane.

Forbidden by default:

- production database;
- Supabase service-role access;
- tenant PII persistence;
- release authority;
- direct main writes;
- production deployment;
- unscoped secrets.

If the PC Gamer is offline:

```text
job
  -> remains queued
  -> routes to another worker
  -> or escalates to cloud
```

Peskids production must continue unaffected.

## Mac role

The Mac is primarily the engineering/dispatch node.

It may run:

- git working copy;
- trusted task dispatcher;
- local prompt watcher;
- vendor CLI bridges;
- Claude/Codex/Cursor/OpenCode;
- Hermes Agent upstream;
- OpenClaw upstream for engineering tasks.

The Mac may create branches and PRs.

It must not directly bypass review or production gates.

## Model routing

Agent runtime and model provider are separate decisions.

Example:

```text
Task
 |
 v
Opsly risk/capability policy
 |
 +--> local / low-risk
 |      -> Hermes Agent or OpenClaw
 |      -> Ollama on PC Gamer
 |
 +--> complex engineering
 |      -> Claude / Codex / Cursor
 |
 +--> security / production / low confidence
        -> stronger external model + independent review
```

The objective is **local-first when appropriate**, not local-only.

Local models should absorb cheap/repetitive work, but high-risk decisions still require stronger policy/review gates.

## Execution isolation

Use several layers together:

1. trusted task source;
2. authenticated node identity;
3. least-privilege capability grant;
4. scoped filesystem/worktree;
5. restricted secrets;
6. network/egress controls where practical;
7. resource limits;
8. branch-only writes;
9. PR/CI/reviewer gate;
10. production change-window policy.

Container-per-agent is optional.

These controls are mandatory regardless of packaging.

## Recommended deployment patterns

### Pattern A — CLI bridge on Mac

```text
Opsly -> local-agent bridge -> vendor CLI -> repo worktree
```

Good for:

- coding;
- review;
- planning;
- PR creation.

### Pattern B — GPU worker on PC Gamer

```text
BullMQ -> PC Gamer worker -> OpenClaw/Ollama -> GPU
```

Good for:

- local LLM;
- embeddings;
- render;
- batch analysis.

### Pattern C — isolated long-running agent container

```text
Opsly -> queue -> dedicated agent container -> restricted workspace
```

Good when:

- runtime must remain always-on;
- dependencies conflict;
- stronger process/resource isolation is useful.

### Pattern D — cloud agent

```text
Opsly -> external CLI/API -> cloud model
```

Good for:

- hard debugging;
- architecture;
- high-complexity code;
- independent review.

## Anti-patterns

Do not:

- create one orchestrator per agent;
- create a second Redis/task system for Hermes/OpenClaw;
- let each agent own production credentials;
- expose agent bridges publicly;
- assume Docker alone is a security boundary;
- duplicate upstream Hermes/OpenClaw functionality inside Opsly;
- make PC Gamer required for production availability;
- hardwire routing by hostname instead of capabilities.

## Canonical responsibility table

| Component | Identity | Packaging | Authority |
|---|---|---|---|
| Opsly Orchestrator | control plane | container/service | queue + policy + runtime coordination |
| Redis/BullMQ | state/queue plane | container/service | jobs/locks |
| Opsly MCP | tool plane | container/service | scoped tools |
| Opsly Task Coordinator | internal module | inside orchestrator | lifecycle/routing semantics |
| Opsly Agent Control Layer | internal module | inside orchestrator | policy/routing/governance |
| Hermes Agent upstream | external worker/runtime | host daemon or container | scoped agent capabilities |
| OpenClaw upstream | external worker/runtime | host daemon or container | scoped agent capabilities |
| Claude/Codex/Cursor/OpenCode | external workers | host CLI/bridge | engineering capabilities |
| Ollama | model runtime | node-local service/container | inference only |
| PC Gamer | compute node | WSL/Docker/services | ephemeral compute |
| Mac | engineering node | host processes | dispatch + engineering |
| VPS | trusted control node | Docker/services | control plane |

## Migration rule

The naming cleanup must be compatibility-first.

Do not rename persisted identifiers just to make names pretty.

Sequence:

1. document canonical semantic names;
2. add aliases/facades;
3. migrate new call sites;
4. deprecate ambiguous names;
5. migrate persisted identifiers only with an explicit compatibility/migration plan.

## Related

- `docs/01-development/OPENCLAW-TERMINOLOGY.md`
- `docs/03-agents/HERMES-INTEGRATION.md`
- `docs/04-infrastructure/PC-GAMER-WORKER.md`
- `config/external-agent-registry.json`
- `config/compute-workers.json`
- `docs/01-development/night-queue/026-upstream-hermes-openclaw-integration.md`
