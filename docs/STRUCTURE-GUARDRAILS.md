---
status: canon
owner: architecture
last_review: 2026-05-10
---

# Structure Guardrails (Opsly)

`docs/` es el Brain compartido de Opsly para humanos, Cursor, Claude, Copilot,
OpenCode, workers locales y NotebookLM. No es un directorio de descarga: cada
documento debe tener carpeta dueña, estado y propósito claros.

## Raíz del Repo

Permitido en la raíz:

- `AGENTS.md`, `README.md`, `ROADMAP.md`, `VISION.md`.
- `SECURITY.md` (política de seguridad para GitHub; detalle en `docs/04-infrastructure/`).
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (convenciones GitHub; contenido largo en `docs/01-development/`).
- Manifests/configs de tooling (`package.json`, `turbo.json`, `tsconfig.json`,
  `vercel.json`, `doppler.json`, Dockerfiles y configs de lint/formato).
- Carpetas de código/plataforma (`apps/`, `packages/`, `infra/`, `scripts/`,
  `config/`, `runtime/`, `docs/`, etc.).

No permitido en la raíz:

- Stubs Markdown adicionales como `ARCHITECTURE.md`, `HANDOFF.md`,
  `SPRINT-TRACKER.md` o `.openclaw.md`; esos deben vivir solo bajo `docs/`.
- Reportes de sesión, evidencias E2E, planes de fase, auditorías, análisis JSON
  o documentos de consolidación.
- Dumps, logs y salidas temporales. Usar `runtime/`, `docs/reports/` o
  `docs/history/` según corresponda.
- Nuevos documentos largos que puedan vivir bajo `docs/`.

## Brain Obsidian (`docs/`)

Solo deben vivir directamente en `docs/` (solo **hubs**, sin otros `.md`):

- `README.md`, `index.md`, `STRUCTURE-GUARDRAILS.md`.
- Contrato OpenAPI (subset CI): `00-architecture/openapi-opsly-api.yaml` (no duplicar en la raíz de `docs/`).

**Stubs de compatibilidad** (redirecciones cortas, no contenido real): carpeta
[`stubs/`](./stubs/README.md) — p. ej. `stubs/AGENTS.md` → `03-agents/AGENTS.md`.

Todo lo demás debe ir en una carpeta dueña:

| Carpeta | Uso |
| --- | --- |
| `00-architecture/` | Arquitectura estable, diagramas, contratos técnicos. |
| `01-development/` | Roadmap activo, sprints, planning vivo, estado de producto. |
| `02-tools/` | Herramientas internas, MCPs auxiliares, Obsidian, Drive, n8n. |
| `03-agents/` | Agentes, prompts, skills, guardrails, Hive/OpenClaw operativo. |
| `04-infrastructure/` | VPS, Docker, Traefik, Cloudflare, Tailscale, Redis, Doppler. |
| `04-operations/` | Validaciones y visión operativa no procedimental. |
| `06-multi-agent/` | Coordinación multi-agente y ejecución paralela. |
| `tenants/` | Multi-tenant: baseline prod, runbooks de tenant, testing, onboarding, subclientes. Hub: `tenants/README.md`. |
| `adr/` | ADRs numerados. Hub: `adr/README.md`. Suplementos en subcarpetas, sin duplicar IDs. |
| `runbooks/` | Procedimientos accionables e incident response. |
| `reports/` | Snapshots, informes de sesión, evidencias, resultados puntuales. |
| `audits/` | Auditorías técnicas, seguridad, performance y calidad. |
| `testing/` | Escenarios E2E, QA y planes de prueba. |
| `history/` | Material obsoleto o histórico que ya no es fuente de verdad. |
| `generated/` | Archivos generados automáticamente; no editar a mano. |
| `infrastructure/`, `operations/` | **Solo stubs y README** de compatibilidad; contenido nuevo en `04-infrastructure/`, `04-operations/`. |
| `prompts/` | Hub [`prompts/README.md`](./prompts/README.md); onboarding canónico en [`tenants/onboarding-prompts/`](./tenants/onboarding-prompts/). |

## Frontmatter Recomendado

```yaml
---
status: canon | draft | historical | generated | moved
owner: architecture | operations | agents | product | security | qa
last_review: YYYY-MM-DD
---
```

## Reglas para Agentes

- Antes de crear documentación, elegir una carpeta dueña.
- Si se mueve un documento consumido por agentes/scripts, dejar stub en `docs/stubs/`, no en la raíz de `docs/`.
- No crear documentos nuevos directamente bajo `docs/` salvo los tres hubs; los stubs van en `docs/stubs/`.
- No duplicar ADR IDs; usar subcarpetas de suplemento cuando haga falta.
- No editar archivos bajo `docs/generated/` a mano.
- Tras cambios de documentación: ver [`01-development/DOCUMENTATION-LIFECYCLE.md`](./01-development/DOCUMENTATION-LIFECYCLE.md) (pruebas → docs → índices → cierre).

## Multi-tenant y API

- **Plano HTTP canónico:** `apps/api/app/api/**`.
- **`apps/web/app/api/**`:** mantener como proxies hacia el API salvo excepción documentada; ver [`01-development/API-CORE-PORTFOLIO.md`](./01-development/API-CORE-PORTFOLIO.md) y [`tenants/production/TENANT-PRODUCTION-BASELINE.md`](./tenants/production/TENANT-PRODUCTION-BASELINE.md) (stub: [`04-infrastructure/TENANT-PRODUCTION-BASELINE.md`](./04-infrastructure/TENANT-PRODUCTION-BASELINE.md)).

## Producción por tenant

- Hub: [`tenants/README.md`](./tenants/README.md).
- Checklist única: [`tenants/runbooks/TENANT-PRODUCTION-CHECKLIST.md`](./tenants/runbooks/TENANT-PRODUCTION-CHECKLIST.md) (stub en `runbooks/`).
- Rollout por cohortes: [`tenants/runbooks/TENANT-PRODUCTION-ROLLOUT.md`](./tenants/runbooks/TENANT-PRODUCTION-ROLLOUT.md) (stub en `runbooks/`).

## Validación

- Validación de estructura del repo (incluye raíz de `docs/` frente a `config/docs-root-allowlist.json`): `npm run validate-structure`.
- Guard de staged files (raíz repo + raíz `docs/`): `bash scripts/hooks/structure-guard.sh`.
- Validación de contexto JSON: `npm run validate-context`.

---

## Enlaces relacionados

- [[brain/README|brain]]
- [[brain/README|Brain Central]]
