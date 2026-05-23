---
status: evergreen
owner: operations
last_review: 2026-05-22
type: claim
tags:
  - claim
  - verified
  - opsly/trading
confidence: alta
related_sources:
  - obsidian/sources/trading-pattern-sources.md
---

# Trading Pattern Radar

> Trading systems should be built as decision support first, automation second,
> and live execution only after approval and risk controls are explicit.

## What to copy

- Backtesting engine before live execution.
- Paper trading / dry-run mode.
- Risk engine with limits and kill switch.
- Strategy optimization and replayable research notebooks.
- Clear separation between signals, execution, and reporting.

## What not to copy

- Any promise of guaranteed profit.
- Live execution without a kill switch.
- Mixing research data with production credentials.

## Why it matters to Opsly

- Adds a future vertical for signals, alerts, and managed trading ops.
- Fits the same agent + approval + audit model as Peskids.
- Reuses the same brain taxonomy and startup prompt pattern.

## Connections

- [[obsidian/research/pattern-constellation]]
- [[brain/agents/README]]
- [[brain/workflows/README]]
- [[brain/architecture/README]]

