---
status: canon
owner: agents
last_review: 2026-05-09
---

# Agents MOC

Cerebro operativo de agentes: contexto, prompts, roles, guardrails, Hive, OpenClaw, Hermes y ejecución local.

## Qué va aquí

- Contratos y guardrails de agentes.
- Prompts, skills, roles y coordinación multi-agente local.
- Documentación de OpenClaw/Hermes desde la perspectiva de agentes.

## Qué no va aquí

- Arquitectura base del sistema; usar `../00-architecture/`.
- Procedimientos de despliegue; usar `../runbooks/` o `../04-infrastructure/`.

## Documentos clave

- `AGENT-BRAIN-CONTRACT.md` (incluye cierre documental)
- [`../../tools/agent-packs/README.md`](../../tools/agent-packs/README.md) — source copies de packs externos y ubicación canónica del mirror local
- [`../01-development/DOCUMENTATION-LIFECYCLE.md`](../01-development/DOCUMENTATION-LIFECYCLE.md) — plan → código → pruebas → docs → índices
- `AGENT-GUARDRAILS.md`
- `AGENTS.md`
- `COPILOT-CODING-AGENT.md` — firewall del agente en PRs de GitHub (sin SSH/Tailscale)
- `LOCAL-AGENT-EXECUTION.md`
- `SOCIAL-MEDIA-AGENT-SYRA.md`
