---
id: node-auth-provenance-enforcement-053
status: held
priority: P1
agent: local_claude
owner: security
environment: local
cost_class: free_with_quota
estimated_cost_usd: 0
requires_pr: true
requires_approval: true
paid_infra_required: false
production_deploy: false
autonomy: supervised
estimated_minutes: 60
resource_class: medium
node_types: mac
blocked_by: physical-node-secret-enrollment
architecture_patterns: TaskSourceGuard, AgentTaskEnvelopeV1, node identity, capability policy
---

# Node Auth and Provenance Enforcement

## Goal

Wire the already-defined trusted task-source and node-identity contracts into live execution without adding another orchestrator or trusting public GitHub text as instructions.

## Hold condition

Do not unhold until unique secret material can be provisioned outside Git for the target nodes.

No credential values belong in this workpack or repository.

## Required implementation

### Task provenance

Propagate and validate, before autonomous engineering execution:

- source repository;
- trusted branch/ref;
- exact source SHA;
- trusted path;
- actor identity;
- task/workpack id.

Use `TaskSourceGuard` from `lib/agent-task-core`.

Issues, PR bodies/comments, review comments, commit messages, diffs, external documents and agent output remain context/data only.

### Node identity

Bind requests to:

- stable `node_id`;
- unique node credential;
- capability policy from `config/trusted-execution-nodes.json`;
- request/task correlation.

A token for node A must not authenticate node B.

### Capability enforcement

Reject tasks when:

- node is missing/disabled;
- credential does not map to node;
- requested capability is absent;
- source provenance is invalid;
- node attempts a forbidden operation.

## Acceptance tests

At minimum:

1. trusted main/night-queue task + trusted actor accepted by provenance guard;
2. issue/PR/comment/diff cannot become an executable task;
3. fork/untrusted ref rejected;
4. source SHA mismatch rejected;
5. wrong node credential rejected;
6. cross-node credential replay rejected;
7. disabled/unknown node rejected;
8. capability mismatch rejected;
9. allowed node + allowed read-only task succeeds;
10. logs/results never serialize credential values.

## Hard boundaries

- No shared new permanent token.
- No secrets in Git.
- No public ingress.
- No direct-main write.
- No autonomous production deploy.
- No second queue/orchestrator.
- Do not weaken existing `PLATFORM_ADMIN_TOKEN` / bridge auth while adding node identity.
