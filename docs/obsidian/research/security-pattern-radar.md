---
status: evergreen
owner: operations
last_review: 2026-05-22
type: claim
tags:
  - claim
  - verified
  - opsly/security
confidence: alta
related_sources:
  - obsidian/sources/security-pattern-sources.md
---

# Security Pattern Radar

> Security tooling patterns should be defensive, observable, and approval-first.

## What to copy

- Agentless or low-friction posture scans.
- Secret scanning in CI and pre-commit hooks.
- Template-driven vulnerability checks.
- Audit logs for privileged actions.
- Hardening baselines with clear remediation output.
- Continuous checks for cloud, app, and repo surfaces.

## What not to copy

- Silent destructive remediation.
- Security tooling without a human-visible report.
- Mixing privileged access with public frontend flows.

## Why it matters to Opsly

- Opsly can sell hardening, monitoring, and audit as a service.
- Peskids and future tenants can inherit the same baseline.
- Agent runtimes can be constrained by a security policy layer.

## Connections

- [[obsidian/research/pattern-constellation]]
- [[brain/agents/README]]
- [[brain/architecture/README]]
- [[brain/workflows/README]]

