---
status: canon
owner: architecture
last_review: 2026-05-10
---

# Opsly Brain — índice Obsidian (MOC)

Punto de entrada compacto del vault. Política de carpetas:
[`STRUCTURE-GUARDRAILS.md`](STRUCTURE-GUARDRAILS.md). Índice narrativo del repo:
[`README.md`](README.md).

## Hubs y contratos (raíz del vault)

- [`README.md`](README.md) — mapa del vault
- [`STRUCTURE-GUARDRAILS.md`](STRUCTURE-GUARDRAILS.md) — reglas de ubicación
- [`openapi-opsly-api.yaml`](00-architecture/openapi-opsly-api.yaml) — contrato API (subset)
- Ciclo de vida de tenants: [`00-architecture/TENANT-INCUBATION-LIFECYCLE.md`](00-architecture/TENANT-INCUBATION-LIFECYCLE.md), [`04-infrastructure/VPS-PROVISIONING-STANDARD.md`](04-infrastructure/VPS-PROVISIONING-STANDARD.md), [`runbooks/MIGRATION-CHECKLIST.md`](runbooks/MIGRATION-CHECKLIST.md)
- Opsly Moon (control plane): [`00-architecture/OPSLY-MOON.md`](00-architecture/OPSLY-MOON.md), [`00-architecture/OPSLY-MOON-AUDIT.md`](00-architecture/OPSLY-MOON-AUDIT.md), [`00-architecture/OPSLY-MOON-DATA-SOURCES.md`](00-architecture/OPSLY-MOON-DATA-SOURCES.md), [`00-architecture/OPSLY-MOON-ROUTE-MAP.md`](00-architecture/OPSLY-MOON-ROUTE-MAP.md) · runbooks [`runbooks/OPSLY-MOON-OPERATIONS.md`](runbooks/OPSLY-MOON-OPERATIONS.md)
- Stubs de compatibilidad: [`stubs/README.md`](stubs/README.md)
- Repo (fuera del vault): [`AGENTS.md`](../AGENTS.md), [`VISION.md`](../VISION.md), [`ROADMAP.md`](../ROADMAP.md)
- Mission Control Kit (agency ICSO + tenants): [`00-architecture/MISSION-CONTROL-KIT.md`](00-architecture/MISSION-CONTROL-KIT.md), rollout [`runbooks/MISSION-CONTROL-TENANT-ROLLOUT.md`](runbooks/MISSION-CONTROL-TENANT-ROLLOUT.md), ICSO [`runbooks/ICSO-MISSION-CONTROL.md`](runbooks/ICSO-MISSION-CONTROL.md)

## Pilares numerados (gobierno docs)

| Carpeta | Hub |
| --- | --- |
| [`00-architecture/`](00-architecture/README.md) | Arquitectura estable, diagramas |
| [`01-development/`](01-development/README.md) | Roadmap, sprints, handoffs |
| [`02-tools/`](02-tools/README.md) | MCP, NotebookLM, Drive, **Obsidian** |
| [`03-agents/`](03-agents/README.md) | Agentes, guardrails, OpenClaw, packs locales |
| [`04-infrastructure/`](04-infrastructure/README.md) | VPS, Traefik, Tailscale, Doppler |
| [`04-operations/`](04-operations/README.md) | Visión operativa |
| [`05-deployment-status/`](05-deployment-status/) | Estado despliegue (sin README — usar explorador) |
| [`06-multi-agent/`](06-multi-agent/README.md) | Multi-agente y paralelismo |
| [`tenants/`](tenants/README.md) | Multi-tenant: prod, runbooks, testing, onboarding |

## Decisiones, procedimientos, calidad

| Carpeta | Hub |
| --- | --- |
| [`adr/`](adr/README.md) | ADRs numerados |
| [`runbooks/`](runbooks/README.md) | Runbooks e incident response |
| [`testing/`](testing/README.md) | E2E, QA |
| [`audits/`](audits/README.md) | Auditorías |
| [`reports/`](reports/README.md) | Informes y evidencias |
| [`history/`](history/README.md) | Material histórico |
| [`generated/`](generated/README.md) | Generado (no editar a mano) |
| [`plans/`](plans/README.md) | Planes puntuales |

## Cerebro enlazado y dominios extra

| Carpeta | Uso |
| --- | --- |
| [`brain/`](brain/README.md) | Vault semántico (módulos, tenants, workflows) |
| [`../tools/agent-packs/README.md`](../tools/agent-packs/README.md) | Mirror local de packs externos y referencia operativa |
| [`design/`](design/) | Diseño de orquestación y producto |
| [`implementation/`](implementation/) | Notas de implementación |
| [`orchestrator/`](orchestrator/) | Docs del orchestrator |
| [`obsidian/`](obsidian/) | Notas específicas Obsidian |
| [`ops/`](ops/) | Ops interno |
| [`security/`](security/) | Seguridad |
| [`database/`](database/) | Esquema / datos |
| [`emails/`](emails/) | Plantillas email |
| [`growth/`](growth/) | Growth |
| [`research/`](research/) | Investigación |
| [`prompts/`](prompts/README.md) | Prompts (hub); onboarding → [`tenants/onboarding-prompts/`](tenants/onboarding-prompts/) |
| [`postman/`](postman/README.md) | Postman |
| [`n8n-workflows/`](n8n-workflows/) | Workflows n8n |
| [`tenants/legalvial/`](tenants/legalvial/) | Subcliente LegalVial |
| [`infrastructure/`](infrastructure/README.md) | Stubs de compatibilidad → [`04-infrastructure/`](04-infrastructure/README.md) |
| [`operations/`](operations/README.md) | Stubs de compatibilidad → [`04-operations/`](04-operations/README.md) |

## Herramientas Obsidian

- Guía: [`02-tools/OBSIDIAN-README.md`](02-tools/OBSIDIAN-README.md)
- **Investigación + grafo (web, navegador, fuentes):** [`02-tools/OBSIDIAN-RESEARCH-BRAIN.md`](02-tools/OBSIDIAN-RESEARCH-BRAIN.md)
- Sistema conocimiento (NotebookLM + Obsidian): [`02-tools/KNOWLEDGE-SYSTEM.md`](02-tools/KNOWLEDGE-SYSTEM.md)
- Regenerar listado de `.md` del vault: `npm run obsidian:file-index` → `.obsidian/file-index.json`

## Wiki: Obsidian + NotebookLM + Graphyfi

| Capa | Documento / artefacto |
| --- | --- |
| MOC (mapa) | Esta página [`index.md`](index.md) + [`README.md`](README.md) |
| Ciclo plan → pruebas → docs → cierre | [`01-development/DOCUMENTATION-LIFECYCLE.md`](01-development/DOCUMENTATION-LIFECYCLE.md) |
| Contrato agentes | [`03-agents/AGENT-BRAIN-CONTRACT.md`](03-agents/AGENT-BRAIN-CONTRACT.md) |
| Índice buscable | `config/knowledge-index.json` (`npm run index-knowledge`) |
| Grafo MCP | `apps/mcp/src/tools/graphyfi.ts`, taxonomía `doc:<slug>` en el contrato |

**Brechas típicas:** grafo GitHub (`config/github-module-graph.json`), notas `docs/brain/modules/`, regen de índice tras muchos commits de docs.

## Grafo y enlaces

- Usa wikilinks `[[nota]]` entre notas del mismo vault.
- Para notas fuera de `docs/`, enlaces Markdown estándar a rutas del repo (`../AGENTS.md`).
