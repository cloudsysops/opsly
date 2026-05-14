---
status: canon
owner: architecture
last_review: 2026-05-10
---

# Opsly Documentation Brain

`docs/` es el vault Obsidian compartido de Opsly. Usa este mapa para elegir la
carpeta correcta antes de crear o editar documentación.

## Lectura Rápida

- Estado operativo de sesión: [`03-agents/AGENTS.md`](03-agents/AGENTS.md) (stub: [`stubs/AGENTS.md`](stubs/AGENTS.md)); repo raíz: [`../AGENTS.md`](../AGENTS.md).
- Norte de producto: [`01-development/VISION.md`](01-development/VISION.md) (stub: [`stubs/VISION.md`](stubs/VISION.md)); repo raíz: [`../VISION.md`](../VISION.md).
- Roadmap activo: [`01-development/ROADMAP.md`](01-development/ROADMAP.md) (stub: [`stubs/ROADMAP.md`](stubs/ROADMAP.md)); repo raíz: [`../ROADMAP.md`](../ROADMAP.md).
- Reglas de estructura: [`STRUCTURE-GUARDRAILS.md`](STRUCTURE-GUARDRAILS.md).
- Índice compacto Obsidian (MOC de todo el vault): [`index.md`](index.md).
- Ciclo documental (plan, pruebas, docs, índices, sin tareas a medias): [`01-development/DOCUMENTATION-LIFECYCLE.md`](01-development/DOCUMENTATION-LIFECYCLE.md).

## Brain Map

| Área | Uso principal |
| --- | --- |
| [`00-architecture/`](00-architecture/README.md) | Arquitectura estable, diagramas, contratos técnicos. |
| [`01-development/`](01-development/README.md) | Roadmap activo, sprints, planning vivo, handoffs y **ciclo de vida documental**. |
| [`02-tools/`](02-tools/README.md) | MCPs, NotebookLM, Drive, Obsidian, n8n y herramientas internas. |
| [`03-agents/`](03-agents/README.md) | Agentes, prompts, skills, guardrails y OpenClaw operativo. |
| [`04-infrastructure/`](04-infrastructure/README.md) | VPS, Traefik, Docker, Cloudflare, Tailscale, Redis y Doppler. |
| [`04-operations/`](04-operations/README.md) | Validaciones y visión operativa no procedimental. |
| [`06-multi-agent/`](06-multi-agent/README.md) | Coordinación multi-agente y ejecución paralela. |
| [`tenants/`](tenants/README.md) | Multi-tenant: prod, runbooks, testing, onboarding. |
| [`adr/`](adr/) | ADRs numerados y suplementos. |
| [`runbooks/`](runbooks/README.md) | Procedimientos accionables e incident response. |
| [`reports/`](reports/README.md) | Snapshots, evidencias y reportes puntuales. |
| [`audits/`](audits/README.md) | Auditorías técnicas, seguridad, performance y calidad. |
| [`testing/`](testing/README.md) | Escenarios E2E, QA y planes de prueba. |
| [`history/`](history/README.md) | Material histórico u obsoleto. |
| [`generated/`](generated/README.md) | Archivos generados; no editar a mano. |

## Stubs (`docs/stubs/`)

Redirecciones cortas; el índice está en [`stubs/README.md`](stubs/README.md).

## Reglas para Nuevos Docs

- No crear Markdown nuevo en la raíz del repo salvo `AGENTS.md`, `README.md`, `ROADMAP.md` o `VISION.md`.
- No crear documentos completos directamente bajo `docs/` (salvo los tres hubs); usa una carpeta dueña.
- Reportes y evidencias van a `docs/reports/`; planes históricos a `docs/history/`.
- Runbooks accionables van a `docs/runbooks/`; arquitectura estable a `docs/00-architecture/`.
- Si una ruta vieja es consumida por agentes o scripts, deja stub en `docs/stubs/`.
- Valida con `npm run validate-structure` antes de cerrar cambios de documentación.
