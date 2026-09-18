# Opsly Software Factory — Visual Archive

**Snapshot:** 2026-09-13  
**Canonical epic:** [#1511 — Software Factory: Canonical multi-agent delivery control plane](https://github.com/cloudsysops/opsly/issues/1511)

This folder preserves the visual snapshot of the Opsly Software Factory at the point where Sierra Control, multi-agent delivery, reconciliation, protected production boundaries, execution nodes and the end-to-end factory lifecycle were formalized.

## Software Factory Machine

![Opsly Software Factory Machine](./opsly-software-factory-machine-2026-09-13.avif)

A machine-level view of the factory: intake, admission, planning, dispatch, builders, GitHub branches and Draft PRs, verification, safe repair, reconciliation, merge queue, merge, cleanup and metrics/intelligence.

## Sierra Control Centre

![Opsly Software Factory Control Centre](./opsly-software-factory-control-centre-2026-09-13.avif)

A control-plane view of Sierra Control coordinating Mission Control, product workstreams, agents, GitHub delivery, quality gates and protected Peskids/production boundaries.

## What this snapshot captures

- Human direction + Sierra Control governance
- Mission Control and Dispatcher
- Intake, admission, planning, claims and ownership
- Parallel Builder / Research agents
- GitHub branches + early Draft PR workflow
- Verify, safe repair and reconciliation
- Merge queue, merge and post-merge cleanup
- Metrics / intelligence feedback loop
- Model layer: ChatGPT, Claude, Codex, Hermes, OpenClaw and future models
- Execution nodes: cloud, Mac, PC Gamer and future workers
- Products: Peskids, Astral / Games, Health Travel, Opsly and future products

Peskids and production-sensitive surfaces remain protected and human-controlled unless an explicit change window is opened.

> These visuals are historical product/architecture illustrations, not runtime contracts. The implementation source of truth is the repository and #1511.

## Publishing

These assets are versioned in the public repository so they can be referenced from websites, social posts, decks and project documentation. Prefer the dated filenames when preserving history; after this PR is merged, use the `main` raw paths for stable public links.
