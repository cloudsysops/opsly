---
title: "lib/universe Governance"
description: "Canon versioning for Opsly Universe IP"
---

# lib/universe Governance

- **Owner:** operations / narrative IP
- **Consumers:** Codex, Claude, OpenClaw, content/image/video/story agents, tenant adaptations
- **Non-consumers as dependencies:** this package must not import `content-studio`, YouTube agents, or tenant apps

## Versioning

- `canonVersion` is independent of npm package patch bumps.
- Immutable traits require a **MINOR** canon bump (`1.0` → `1.1`) and a migration note.
- Breaking identity (silhouette, palette, name) requires **MAJOR** canon (`2.0`) and review.
- Tenant overlays never mutate `config/universe` canon.

## Review

PRs that change Visual DNA or immutableTraits need a human pass before merge to `main`.
