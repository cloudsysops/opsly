---
status: proposed
owner: operations
last_review: 2026-09-11
type: adr
tags:
  - opsly/adr
  - opsly/cloud
  - opsly/cost
---

# ADR-041: Free-first cloud cost governance

## Decision

Opsly adopts a **free-first / approval-before-spend** policy for cloud infrastructure.

### Default modes

- `FREE_ONLY`: default. Automated apply is allowed only for resources classified as free-tier/zero-cost within the declared provider constraints.
- `PAID_REQUIRES_APPROVAL`: any plan with estimated non-zero spend, unknown pricing, paid SKU, reserved capacity, minimum instance billing, or paid egress/storage requires explicit human approval before apply.
- `PROHIBITED`: resources that violate architecture invariants (second orchestrator, second queue/control plane, public Redis/database, persistent cloud AI runtimes) cannot be approved by this cost gate alone.

## Required controls

1. Terraform plan before every apply.
2. Cost policy evaluation before apply.
3. Explicit approval token/decision for non-free plans.
4. Mandatory owner, purpose, environment, cost_class and ttl labels/tags where supported.
5. Ephemeral resources require TTL/expiry metadata.
6. Ephemeral resources must expose a deterministic destroy path.
7. CI must never auto-apply paid infrastructure from an unreviewed branch.
8. Secrets remain in Doppler/provider secret stores; never in tfvars committed to git.
9. Free-tier eligibility is treated as a constraint to verify, not an assumption.
10. Unknown cost == paid/approval-required.

## Cost classes

- `free`
- `free_with_quota`
- `ephemeral_metered`
- `paid`
- `unknown`

Only `free` and `free_with_quota` may pass automatically, and only when quota guardrails are configured.

## Ephemeral lifecycle

Preferred pattern:

```
plan
-> policy check
-> apply
-> workload
-> collect evidence
-> destroy
-> verify zero managed ephemeral resources
```

For metered services billed by usage, use scale-to-zero/minimum-instance-zero when supported. For VM/container resources, destroy after task completion unless explicitly promoted.

## Approval

Any non-free plan must include:
- estimated monthly/hourly/one-shot cost
- maximum allowed spend
- expected runtime/TTL
- rollback/destroy command
- reason free tier is insufficient

Human approval is required before apply.

## Architecture invariants

This ADR does not authorize:
- a second BullMQ/Redis control path
- a second Opsly orchestrator
- a second active control plane
- persistent AI agent daemons in cloud
- migration of transactional state merely to consume credits/free tier
