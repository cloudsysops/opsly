---
status: canon
owner: operations
last_review: 2026-09-11
type: architecture
tags:
  - opsly/agents
  - opsly/engineering
  - opsly/control-loop
---

# Opsly Engineering Control Loop

This document is the canonical operating model for autonomous/supervised engineering work in Opsly.

## Goal

Allow an external supervisor such as ChatGPT to place scoped engineering work in GitHub, have existing Opsly agent infrastructure execute it, and receive durable evidence back in GitHub without requiring manual copy/paste for every task.

The control loop must reuse the existing Orchestrator, BullMQ, AgentTask contracts, local agent bridges, CI, pull requests, and production gates.

Do not create a second orchestrator, second MCP server, second Mission Control, or second engineering task system.

## Canonical flow

```text
ChatGPT / operator
        |
        v
GitHub task
docs/01-development/night-queue/*.md
        |
        v
dispatching machine syncs repository
        |
        v
scripts/ops/dispatch-prompt-queue.sh
        |
        v
.cursor/prompts/queue/*.md
        |
        v
scripts/local-prompt-watcher.ts
        |
        v
POST /api/local/prompt-submit
        |
        v
Existing Opsly Orchestrator
        |
        v
BullMQ local-agents
        |
        v
LocalAgentHTTPWorker
        |
        +--> Claude
        +--> Codex
        +--> Cursor
        +--> OpenCode / local models
        |
        v
focused branch + implementation + tests
        |
        v
Pull Request
        |
        v
CI + independent reviewer
        |
        v
merge decision
        |
        +--> non-Peskids blast radius: daytime allowed when gates pass
        |
        +--> Peskids blast radius: night window unless reviewed override
        |
        v
deployment / runtime verification where applicable
```

## Source of truth

GitHub is the durable engineering source of truth.

Use GitHub for:

- queued task specification;
- branch and commit history;
- pull request evidence;
- CI result;
- independent review;
- merge decision;
- deployment references;
- blockers and follow-up work.

BullMQ is the runtime task store for active AgentTask execution, not the long-term audit trail.

## Task contract

Each task should include:

- `id`
- `status`
- objective
- why it matters
- scope
- non-goals
- risk
- autonomy mode
- acceptance criteria
- tests required
- evidence required
- expected PR(s)
- next smallest action

Recommended states:

```text
pending
claimed
running
pr_open
reviewing
blocked
done
failed
```

The current system has runtime deduplication through BullMQ job IDs. Atomic GitHub-visible claim/lock remains a control-loop improvement until implemented.

## Builder and reviewer separation

Builder != reviewer.

Examples:

```text
Claude builder -> Codex reviewer
Codex builder  -> Claude reviewer
```

An agent must not approve its own change.

Independent review should check:

- correctness;
- security;
- tenant isolation;
- runtime blast radius;
- tests;
- rollback implications;
- production gate classification.

## Machine roles

### Mac / dispatching workstation

Current primary role:

- keeps a working copy of `cloudsysops/opsly`;
- runs the local/night queue dispatcher;
- runs or reaches CLI agent bridges;
- submits work to the Opsly Orchestrator.

The dispatcher must synchronize GitHub before seeding the local queue using a safe fast-forward-only strategy. Dirty trees, detached HEAD, or unreachable remotes must not cause destructive synchronization.

### PC Gamer

Current primary role:

- GPU/local inference;
- Ollama/local models;
- ffmpeg/video/render/compute workloads;
- scheduled compute worker capacity.

Cursor/Claude/Codex execution on the PC Gamer is not assumed by the canonical architecture unless explicitly wired and verified.

## Security boundary

The engineering loop must fail closed.

Required controls:

- `PLATFORM_ADMIN_TOKEN` for agent enqueue/control paths;
- no fallback token such as `local-dev`;
- trusted repository/task source;
- autonomy policy;
- tenant boundary where applicable;
- task budget and paid-provider budget;
- rate/retry limits;
- idempotency/deduplication;
- no direct writes to `main`;
- no automatic production deploy from an engineering task.

## Merge policy

Merge timing is determined by Peskids blast radius, not by whether a file is generically "code".

### Daytime allowed

When CI and review pass, daytime merge is allowed for work outside the Peskids production blast radius, such as:

- internal agent tooling;
- orchestrator-only engineering tooling that is not deployed with Peskids;
- prompts and queue contracts;
- architecture/docs;
- research or developer tooling;
- other isolated Opsly components with no Peskids runtime dependency.

### Night window

Changes that can affect Peskids stay protected by the production change window.

Direct impact includes:

- `apps/peskids/**`
- `apps/peskids-franchise/**`
- Peskids-specific scripts/workflows

Shared impact includes conservative shared surfaces such as:

- `apps/api/**`
- `supabase/**`
- `infra/**`
- shared `packages/**` / `lib/**`
- shared deploy/VPS/onboarding scripts
- dependency manifests

Use `safe-daytime` only when a reviewer explicitly confirms that a flagged change cannot affect Peskids.

Use `hotfix-prod` only for an emergency.

See `docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`.

## Notification policy

Operator-facing notifications are exception-driven.

### P0 — immediate

- production outage/regression;
- auth bypass;
- unauthenticated paid-LLM/side-effect path;
- credential compromise evidence;
- runaway paid spend;
- destructive database issue;
- webhook/n8n failure causing data loss or duplicate effects;
- rollback required.

### P1 — decision required

- architecture/security/product choice;
- migration approval;
- network/public exposure change;
- schema compatibility decision;
- provider/budget decision.

### P2 — ready for review

Send when:

- focused PR complete;
- required CI finished;
- independent reviewer finished;
- evidence attached;
- no unresolved blocker.

### Suppress

Do not notify for:

- repeated healthy checks;
- routine commits;
- successful maintenance;
- raw logs;
- recovered retries;
- agent chatter.

## Current known gap

The desired end-to-end milestone is:

```text
ChatGPT creates task in GitHub
-> dispatching machine discovers it automatically
-> Orchestrator creates/executes AgentTask
-> builder creates PR
-> independent reviewer reviews
-> GitHub contains final evidence
-> ChatGPT detects result and surfaces only decisions/material changes
```

The repository already contains most of the execution path. The remaining work is to make pickup, claim/state writeback, independent review triggering, and result detection reliable and observable.

## Related

- `docs/00-architecture/AGENT-ROUTING.md`
- `docs/01-development/AGENT-PROMPT-QUEUE.md`
- `docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`
- `docs/adr/ADR-048-agent-task-store.md`
