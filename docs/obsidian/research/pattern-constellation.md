---
status: evergreen
owner: operations
last_review: 2026-05-22
type: claim
tags:
  - claim
  - verified
  - opsly/patterns
confidence: alta
related_sources:
  - obsidian/sources/opsly-agent-pattern-sources.md
  - obsidian/sources/frontier-pattern-sources.md
  - obsidian/sources/saas-pattern-sources.md
  - obsidian/sources/security-pattern-sources.md
  - obsidian/sources/trading-pattern-sources.md
---

# Pattern Constellation

> Opsly should load one constellation of reusable patterns at startup: agents,
> SaaS, security, trading, and frontier domains.

## Purpose

This note is the quick map a new agent should read after taxonomy and before
deep work. It points to the domain-specific radars without duplicating them.

## Domains

- [[obsidian/research/agent-pattern-matrix]] — runtime Python, training, evaluation, commercial agent business.
- [[obsidian/research/frontier-pattern-radar]] — space, navigation, marketing, architecture, time/replay.
- [[obsidian/research/saas-pattern-radar]] — white-label, B2B SaaS, admin shells, multi-tenant packaging.
- [[obsidian/research/security-pattern-radar]] — hardening, secrets, scanning, audit, defensive posture.
- [[obsidian/research/trading-pattern-radar]] — signals, backtesting, paper trading, risk, approval.

## Rule

Prefer the smallest relevant radar first.
Do not load all radars unless the task genuinely spans multiple domains.

## Connections

- [[obsidian/TAXONOMY]]
- [[brain/agents/README]]
- [[brain/architecture/README]]
- [[brain/workflows/README]]

