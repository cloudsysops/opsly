---
id: github-queue-write-approval-051
status: held
priority: P2
agent: local_claude
owner: platform
environment: local
cost_class: free_with_quota
estimated_cost_usd: 0
requires_pr: true
requires_approval: true
paid_infra_required: false
production_deploy: false
autonomy: supervised
estimated_minutes: 45
resource_class: medium
node_types: mac
architecture_patterns: AgentTaskEnvelopeV1, explicit approval, governed dispatch
---

# GitHub Agent Queue Write Approval Propagation

## Goal

Design and implement a first-class approval chain for future write-capable GitHub Agent Queue work without weakening AgentTask policy.

## Context

The canonical GitHub Agent Queue is intentionally read-only today. Do **not** change that invariant until this workpack is explicitly unheld and approved.

## Required design

A write-capable task must prove all of the following:

1. the tracked workpack explicitly declares write intent;
2. a trusted approval event exists and is bound to the exact task/request identity;
3. approval is carried into or referenced by AgentTaskEnvelopeV1 through a typed contract;
4. AgentTaskRuntime validates that approval before allowing `write_allowed=true`;
5. approval cannot be inferred only from an HTTP header;
6. approval cannot be reused for a different request/workpack/SHA;
7. audit evidence records approver/source/time without exposing secrets;
8. read-only tasks remain approval-free;
9. paid infra and production deploy remain separate explicit gates.

## Acceptance

- threat model documented;
- typed approval contract;
- tests for approved write, missing approval, stale/replayed approval, mismatched SHA/request and read-only execution;
- no global `autoApproveSensitive=true`;
- no bypass of AgentTaskRuntime;
- one canonical control plane;
- one PR with migration notes.

## Hard boundaries

- HOLD until the read-only GitHub → Gamer E2E is green.
- No production deploy.
- No paid resources.
- Do not weaken existing fail-closed policy.
