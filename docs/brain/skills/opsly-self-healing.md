---
name: opsly-self-healing
version: 1.0.0
category: infrastructure
priority: high
triggers:
  - self-healing
  - auto-repair
  - healing
  - alerts
  - discord alerts
  - url failed
  - container down
  - domain mismatch
cross_refs:
  - opsly-infra
  - opsly-discord
  - opsly-tenant
tags:
  - opsly/skill
  - opsly/infrastructure
---

# opsly-self-healing

> Self-healing agent: detección y reparación automática de domain mismatch, DNS wildcard, middlewares Traefik, contenedores caídos. Alertas de Discord, URL failed to redirect, 404 en tenants.

## Cross-refs
[[opsly-infra]] · [[opsly-discord]] · [[opsly-tenant]]

## Links
- [SKILL.md](../../../packages/skills/user/opsly-self-healing/SKILL.md)
