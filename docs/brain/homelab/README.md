---
status: active
owner: operations
type: moc
visibility: internal
scope: platform
agent_access: allow
sensitivity: normal
source_of_truth: brain
tags:
  - opsly/brain
  - homelab
  - infrastructure
  - moc
---

# Homelab MOC

Knowledge for evolving Mac + VPS + PC Gamer into a measured, secure homelab.

## Current roles

- VPS: trusted always-on control plane
- Mac: engineering/dispatch node
- PC Gamer: ephemeral GPU compute node
- Google Drive: archive/cold storage
- GitHub: code + durable engineering evidence

## Knowledge to track

- capacity measurements
- disk pressure
- compute utilization
- network topology
- storage architecture
- backup/restore evidence
- hardware procurement decisions
- power/UPS
- NAS design
- node enrollment/security
- total cost of ownership

## Procurement principle

Buy against measured bottlenecks, not enthusiasm.

Priority:
1. storage/reliability
2. backup
3. networking
4. compute
5. redundancy
