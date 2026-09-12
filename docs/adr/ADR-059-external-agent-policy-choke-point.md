---
status: proposed
owner: security
last_review: 2026-09-11
type: adr
tags:
  - opsly/adr
  - opsly/security
  - opsly/agents
---

# ADR-059: External Agent Runtimes Behind Opsly Policy and Approval

## Status

Proposed — 2026-09-11

## Context

Opsly integrates external agent runtimes including Claude Code, Cursor, Codex, OpenCode, Hermes, OpenClaw, Goose, Aider and Playwright.

These runtimes may have powerful local capabilities:

- read/write repository files;
- execute shell commands;
- invoke git;
- use network tools;
- call provider APIs.

Allowing an external runtime to become a parallel source of authority would defeat Opsly's supervised execution model.

The existing architecture already has:

- AgentTask;
- BullMQ;
- Orchestrator;
- autonomy policy;
- approval gates;
- trusted task source work;
- trusted execution node work.

The missing requirement is to make the authority boundary explicit and progressively enforce it.

## Decision

Opsly remains the authority plane.

External runtimes are replaceable workers.

They do not independently own:

- task authority;
- production authorization;
- merge authority;
- deployment authority;
- tenant authorization;
- billing;
- durable audit truth.

### Choke point

Automated execution must converge on:

`trusted source -> authenticated node -> AgentTask -> policy/approval -> capability-scoped worker`

No issue body, PR comment, arbitrary repository text or external-agent output may create execution authority.

### Bridge authentication

CLI bridges fail closed.

If their execution credential is missing, execution must be unavailable rather than anonymous/local-open.

### Git operations

Repository access alone is not release authority.

Agents may create branches/commits/PRs only when the trusted task and node capability allow it.

The following remain approval-bound:

- merge to protected branch;
- production deployment;
- destructive migration/data mutation;
- secrets changes;
- production routing/network changes;
- external customer communication.

### Legacy payload migration

Current local prompt watcher still submits a legacy payload without full AgentTask/provenance metadata.

Therefore migration is staged:

1. fail-close bridge authentication;
2. propagate trusted source provenance and AgentTask envelope;
3. verify node identity + capabilities;
4. reject automated legacy payloads by default;
5. retain explicit human/admin break-glass separately.

Do not disable legacy execution before step 2 is operationally verified, or the engineering-loop smoke will be broken without a replacement path.

## External upstreams

External source repositories are cloned outside Opsly and pinned by reviewed tag + exact commit SHA.

A new upstream release is never consumed merely because its default branch moved.

## Consequences

Positive:

- smaller blast radius;
- auditable authority;
- replaceable external models/runtimes;
- clearer customer trust story;
- supply-chain changes become reviewable PRs.

Costs:

- more explicit enrollment/configuration;
- migration work for legacy watcher payloads;
- some external-agent features may remain disabled until capability policy is represented.

## Verification

Required tests/evidence:

- missing bridge token -> execution denied;
- wrong token -> denied;
- trusted bridge token -> accepted only through normal task path;
- missing provenance -> automated task denied after migration;
- node A cannot impersonate node B;
- merge/deploy remains outside builder authority;
- upstream checkout SHA matches manifest;
- no secrets serialized into logs/errors.

## Related

- `docs/adr/ADR-023-approval-gate-phase1.md`
- `docs/00-architecture/TRUSTED-EXECUTION-NODES.md`
- `docs/00-architecture/EXTERNAL-AGENT-RUNTIME-STACK.md`
- `config/external-agent-upstreams.json`
- `config/trusted-execution-nodes.json`
