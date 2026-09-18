---
id: oracle-dr-observer-039
status: pending
owner: cursor-builder
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# Oracle Cloud — DR observer / backup receiver

## Goal
Use an Oracle Cloud free-tier node only as offsite resilience infrastructure, never as a second active control plane.

## Deliver
- Terraform or bootstrap script for a minimal VM where feasible
- Tailscale-only administrative connectivity
- encrypted backup receiver for selected Opsly config/database dumps
- external health observer for VPS endpoints
- restore verification procedure
- disk/retention limits
- heartbeat/alert output
- documentation of what is and is not replicated

## Prohibited
- active BullMQ/Redis primary
- second Opsly orchestrator
- public database ports
- release/deploy authority
- production secrets beyond the minimum backup/observer scope

## Acceptance
- can receive an encrypted test backup
- can verify integrity and perform a documented restore drill
- can detect VPS health failure and emit an alert
- loss of Oracle node does not affect production execution
