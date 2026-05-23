---
status: source
owner: operations
last_review: 2026-05-22
type: source-note
url: "file:///Users/dragon/cboteros/proyectos/intcloudsysops/docs/03-agents/OPENCLAW-TEAM-PLAN.md"
title: "Opsly Agent Pattern Sources"
source_type: manual
confidence: media
---

# Opsly Agent Pattern Sources

## URL
file:///Users/dragon/cboteros/proyectos/intcloudsysops/docs/03-agents/OPENCLAW-TEAM-PLAN.md

## Qué dice esta fuente

Opsly ya tiene un stack base de agentes, orquestación, observabilidad y
comercialización. El hueco no es "otro cerebro", sino una librería explícita de
patrones para runtime en Python, seguridad defensiva, evaluación de agentes y
verticales monetizables como trading y training.

## Claims (afirmaciones verificables)

- Opsly already has a canonical orchestration path for local agents and OpenClaw.
  - evidencia: `docs/03-agents/OPENCLAW-TEAM-PLAN.md`, `docs/03-agents/LOCAL-AGENT-EXECUTION.md`
  - confianza: alta
  - limitacion: la coordinación existe, pero no cubre todavía todos los patrones de producto que queremos mapear.
- The vault already separates agents, workflows, architecture and tenants.
  - evidencia: `docs/brain/agents/README.md`, `docs/brain/workflows/README.md`, `docs/brain/architecture/README.md`
  - confianza: alta
  - limitacion: faltan notas específicas para los nuevos patrones de negocio y seguridad.
- Training, security, and trading should live as separate playbooks.
  - evidencia: `docs/blueprints/opsly-operational-blueprint/COMMERCIAL-PACKAGES.md`, `docs/blueprints/opsly-operational-blueprint/NICHE-PLAYBOOKS.md`, `docs/blueprints/opsly-operational-blueprint/SECURITY-AND-TRUST.md`
  - confianza: alta
  - limitacion: el inventario todavía está fragmentado entre docs de blueprint y brain/.

## Qué NO dice (limites)

- No define una API final para los agentes Python.
- No define la estrategia de compliance para trading o apuestas.
- No reemplaza `docs/03-agents/AGENT-BRAIN-CONTRACT.md`.

## Preguntas abiertas (generadas por esta fuente)

- Qué runtime Python es el estándar oficial para workers de agentes.
- Qué métricas de evaluación se vuelven obligatorias para productos vendibles.
- Qué patrones de security tooling se soportan en modo defensivo.

## Enlaces

- MOC: [[obsidian/index]]
- Notas relacionadas:
  - [[obsidian/research/agent-pattern-matrix]]
  - [[brain/agents/README]]
  - [[brain/workflows/README]]

## Metadata

- capture_date: 2026-05-22
- reviewed: false
- next_review:
