---
title: "lib/content-studio Governance"
description: "Package governance — Content OS v2 is the gameplay owner"
---

# lib/content-studio Governance

- **Owner:** operations / Content Studio Maintainer
- **Canon:** `docs/00-architecture/CONTENT-PIPELINE-CANONICAL.md`
- **Registry:** `config/content-capabilities.json`

## Scope

This package holds more than one domain. Do not collapse them.

| Area | Path | Role |
| --- | --- | --- |
| Content OS v2 | `src/content-engine/` | CANONICAL gameplay / commentary / owned ingest |
| Event drafts | `src/{mappers,generators,adapters,rendering/}` | ADAPTER — runtime stories + MoneyPrinterTurbo |
| Brand bible | `src/{characters,series,episodes,campaigns}/` | REFERENCE for Opsly brand channels |

`lib/content-engine` is a **different** package (scene compose). See ADR-058.
Do not copy ffmpeg into a third wrapper.

## Rules

- Envelope `ContentProjectEnvelope` is the gameplay source of truth.
- No publish without human approval.
- PC gamer does not store approvals or publishing secrets.
