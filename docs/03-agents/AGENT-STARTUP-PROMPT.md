---
status: canon
owner: operations
last_review: 2026-05-22
type: prompt
tags:
  - opsly/agents
  - startup
  - notebooklm
---

# Agent Startup Prompt

Use this as the first context block for any new agent session in Opsly.

## Order

1. Read `AGENTS.md`.
2. Read `VISION.md`.
3. Read `docs/03-agents/AGENT-BRAIN-CONTRACT.md`.
4. Read `docs/brain/dashboard.md`.
5. Read `docs/brain/agents/README.md`.
6. Read `docs/obsidian/TAXONOMY.md`.
7. Read `docs/obsidian/research/pattern-constellation.md`.
8. Read `docs/obsidian/research/agent-pattern-matrix.md`.
9. Read `docs/obsidian/sources/opsly-agent-pattern-sources.md`.
10. If the task is cross-domain or exploratory, read `docs/obsidian/research/frontier-pattern-radar.md`.
11. If the task touches SaaS, security, or trading, read the matching radar note.
12. Query NotebookLM if enabled.
13. Consult `config/knowledge-index.json` for repo-first retrieval.

## Standard startup question

```text
Resume el estado actual de Opsly en 5 bullets:
1) qué está funcionando,
2) qué está bloqueado,
3) qué patrones de agentes conviene cargar primero,
4) qué no hay que hacer,
5) qué vertical o tenant está más cerca de monetización.

Prioriza AGENTS.md, VISION.md, AGENT-BRAIN-CONTRACT, Brain Dashboard, Taxonomy,
Pattern Constellation, Agent Pattern Matrix y NotebookLM.
```

## Usage

- Human operators can paste this block into a fresh agent session.
- Runtime bootstrap scripts should load this file before doing any work.
- If NotebookLM is disabled, fall back to `AGENTS.md` and `config/knowledge-index.json`.

---

## Enlaces relacionados

- [[03-agents/README|03-agents]]
- [[brain/README|Brain Central]]
