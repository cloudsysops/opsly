---
id: gamer-routing-fail-closed-047
status: held
priority: P1
agent: local_codex
owner: platform
environment: local
cost_class: free_with_quota
estimated_cost_usd: 0
requires_pr: true
requires_approval: false
paid_infra_required: false
production_deploy: false
blocked_by: github-queue-write-approval-051
autonomy: supervised
estimated_minutes: 30
resource_class: medium
node_types: mac
architecture_patterns: local-agents, compute routing, fail-closed
---

# PC Gamer Routing Fail-Closed

## Goal

Ensure `local_opencode` can never silently fall back to the Mac or an unintended worker.

## Task

Audit and harden routing contracts so that:

1. Mac worker default allowlist excludes `local_opencode`;
2. Gamer plane explicitly claims only the intended local OpenCode kinds;
3. an unavailable Gamer produces queued/blocked evidence rather than Mac fallback;
4. routing decisions are test-covered;
5. compute-worker metadata and docs agree on the node responsible for `local_opencode`;
6. no hostname-specific logic becomes the source of truth.

If code already satisfies the contract, add only missing regression tests/docs.

## Acceptance

- tests demonstrate Mac cannot claim `local_opencode`;
- tests demonstrate intended Gamer routing;
- fallback is explicit/fail-closed;
- one small PR;
- no hardware dependency for CI.

## Hard boundaries

- No network reconfiguration.
- No SSH changes.
- No secrets.
- No production deploy.
