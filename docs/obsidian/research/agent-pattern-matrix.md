---
status: evergreen
owner: operations
last_review: 2026-05-22
type: claim
tags:
  - claim
  - verified
  - opsly/agents
confidence: alta
related_sources:
  - obsidian/sources/opsly-agent-pattern-sources.md
---

# Agent Pattern Matrix

> Opsly debe guardar una librería explícita de patrones para runtime Python,
> seguridad defensiva, training/evaluation y verticales monetizables, pero cada
> vertical debe quedar aislada del core de Peskids.

## Afirmación

Opsly ya tiene el control plane, el orquestador y la capa de conocimiento para
agentes; lo que falta es formalizar los patrones reutilizables que convierten
esa base en productos y servicios vendibles.

## Matriz de patrones

| Patron | Para que sirve | Dónde encaja |
| --- | --- | --- |
| Python agent runtime | Workers, tool calling, retries, memoria, sandboxes | `docs/03-agents/`, `apps/orchestrator/`, futuros workers |
| Evaluation / benchmark | Scorecards, replay de tareas, coste por job | `docs/03-agents/`, `config/knowledge-index.json`, QA |
| Security / pentest defensivo | Secret scanning, hardening, posture checks | `docs/03-agents/`, `docs/blueprints/` |
| Training packs | Playbooks, onboarding, handoff, soporte mensual | `docs/blueprints/opsly-operational-blueprint/` |
| Trading intelligence | Señales, alertas, paper trading, reporting | nuevo playbook separado |
| Odds intelligence | Cuotas, tracking, alertas, comparativas | nuevo playbook separado |

## Evidencia de mapeo actual

- Opsly ya define OpenClaw, LLM Gateway y local agents como base de coordinación.
- El vault ya separa `agents`, `workflows`, `architecture`, `tenants` y `modules`.
- Peskids ya sirve como piloto para el patrón tenant-incubation/extraction.

## Huecos que faltan documentar

1. Runtime estándar de agentes Python.
2. Schema de evaluación y métricas de calidad por tarea.
3. Playbook defensivo de security tooling.
4. Gobernanza de budgets y kill-switch por tenant.
5. Playbook de trading/apuestas separado del core SaaS.

## Conexión con Opsly

- [[brain/agents/README]]
- [[brain/workflows/README]]
- [[brain/architecture/README]]
- [[obsidian/sources/opsly-agent-pattern-sources]]
- [[docs/blueprints/opsly-operational-blueprint/README]]

## Estado

- [x] Mapeado en el vault
- [x] Conectado a Brain / Obsidian
- [ ] Convertido a ADR si alguna parte se vuelve fija
- [ ] Separado por vertical cuando se implemente

