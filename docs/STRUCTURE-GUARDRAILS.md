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

Solo deben vivir directamente en `docs/`:

- Hubs: `README.md`, `index.md`, `STRUCTURE-GUARDRAILS.md`.
- Contratos públicos: `openapi-opsly-api.yaml`.
- Stubs de compatibilidad: `AGENTS.md`, `ROADMAP.md`, `VISION.md`,
  `LLM-GATEWAY.md`, `E2E-TEST-SCENARIOS.md`, `API-CORE-PORTFOLIO.md`,
  `TENANT-PRODUCTION-BASELINE.md`, `TENANT-PRODUCTION-CHECKLIST.md`,
  `TENANT-PRODUCTION-HARDENING.md`, `TENANT-PRODUCTION-ROLLOUT.md`.

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
| `adr/` | ADRs numerados. Suplementos en subcarpetas, sin duplicar IDs. |
| `runbooks/` | Procedimientos accionables e incident response. |
| `reports/` | Snapshots, informes de sesión, evidencias, resultados puntuales. |
| `audits/` | Auditorías técnicas, seguridad, performance y calidad. |
| `testing/` | Escenarios E2E, QA y planes de prueba. |
| `history/` | Material obsoleto o histórico que ya no es fuente de verdad. |
| `generated/` | Archivos generados automáticamente; no editar a mano. |

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
- Si se mueve un documento consumido por agentes/scripts, dejar stub temporal bajo `docs/`, no en la raíz.
- No crear documentos nuevos directamente bajo `docs/` salvo hubs/stubs.
- No duplicar ADR IDs; usar subcarpetas de suplemento cuando haga falta.
- No editar archivos bajo `docs/generated/` a mano.

## Multi-tenant y API

- **Plano HTTP canónico:** `apps/api/app/api/**`.
- **`apps/web/app/api/**`:** mantener como proxies hacia el API salvo excepción documentada; ver [`01-development/API-CORE-PORTFOLIO.md`](./01-development/API-CORE-PORTFOLIO.md) y [`04-infrastructure/TENANT-PRODUCTION-BASELINE.md`](./04-infrastructure/TENANT-PRODUCTION-BASELINE.md).

## Producción por tenant

- Checklist única: [`runbooks/TENANT-PRODUCTION-CHECKLIST.md`](./runbooks/TENANT-PRODUCTION-CHECKLIST.md).
- Rollout por cohortes: [`runbooks/TENANT-PRODUCTION-ROLLOUT.md`](./runbooks/TENANT-PRODUCTION-ROLLOUT.md).

## Validación

- Validación de estructura del repo: `npm run validate-structure`.
- Guard de staged files: `bash scripts/hooks/structure-guard.sh`.
- Validación de contexto JSON: `npm run validate-context`.
