---
name: opsly-revenue-agent
version: 1.0.0
category: operations
priority: high
triggers:
  - revenue agent
  - Revenue OS
  - commission
  - attribution
  - referral
  - affiliate
  - partner
  - provider matching
cross_refs:
  - opsly-context
  - opsly-modularity
  - opsly-supabase
  - opsly-researcher
  - opsly-qa
session_context: >-
  Revenue OS — qualify, match, attribute, commission, partner/provider
  opportunity
subagents:
  - opsly-researcher
  - opsly-api
  - opsly-supabase
  - opsly-qa
when_not: >-
  Do not use for payment execution, investment/trading execution, betting,
  diagnosis, prescriptions, or autonomous outbound.
tags:
  - opsly/skill
  - opsly/operations
---

# opsly-revenue-agent

> Governed Revenue Agent for opportunity qualification, matching, attribution and commission reconciliation.

## Cuándo cargar
Revenue OS — qualify, match, attribute, commission, partner/provider opportunity

## Subagentes recomendados
- [[opsly-researcher]]
- [[opsly-api]]
- [[opsly-supabase]]
- [[opsly-qa]]

## Cuándo NO
Do not use for payment execution, investment/trading execution, betting, diagnosis, prescriptions, or autonomous outbound.

## Cross-refs
[[opsly-context]] · [[opsly-modularity]] · [[opsly-supabase]] · [[opsly-researcher]] · [[opsly-qa]]

## Links
- [SKILL.md](../../../packages/skills/user/opsly-revenue-agent/SKILL.md)
