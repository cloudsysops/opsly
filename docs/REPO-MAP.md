# Mapa del monorepo Opsly

> Una página para saber **dónde editar** y **qué no romper**. Complementa [`README.md`](README.md) y [`AGENTS.md`](../AGENTS.md).

## Fuentes de verdad (no duplicar contenido largo)

| Necesitas | Archivo canónico | Notas |
|-----------|------------------|--------|
| Estado de sesión, bloqueantes, próximo paso | [`AGENTS.md`](../AGENTS.md) (raíz) | Tras cambios relevantes: espejo en `.github/AGENTS.md` vía hook o `npm run sync-agents`. |
| Visión de producto (texto completo) | [`docs/01-development/VISION.md`](01-development/VISION.md) | |
| Visión corta / enlaces | `VISION.md` (raíz), [`.github/VISION.md`](../.github/VISION.md), [`docs/VISION.md`](VISION.md) | Mismo **stub**; no escribir aquí el roadmap largo. |
| Detalle de agentes (rol técnico) | [`docs/03-agents/AGENTS.md`](03-agents/AGENTS.md) | [`docs/AGENTS.md`](AGENTS.md) solo redirige. |
| **Políticas para IA (no tocar prod/secretos)** | [`docs/03-agents/AGENT-GUARDRAILS.md`](03-agents/AGENT-GUARDRAILS.md) | Zona roja / ámbar, Doppler, workflows, migraciones. |
| Índice de toda la wiki | [`docs/README.md`](README.md) | |

## Código y producto

| Ruta | Contenido |
|------|-----------|
| `apps/api`, `apps/admin`, `apps/portal` | Control plane y UIs |
| `apps/orchestrator`, `apps/llm-gateway`, `apps/mcp`, `apps/ml`, `apps/context-builder` | OpenClaw / IA / herramientas |
| `apps/experimental/*-archive` | Archivo histórico; sigue en workspaces: cuidado al `type-check` global |
| `packages/*` | Librerías compartidas |
| `infra/` | Compose, Traefik, plantillas tenant |
| `supabase/` | Migraciones Postgres `platform` / tenants |

## Scripts y operación

| Ruta | Uso |
|------|-----|
| `scripts/` (raíz del árbol) | Muchos entrypoints; convención en evolución |
| `scripts/ci/` | OpenAPI, validación estricta de estructura |
| `scripts/deploy/`, `scripts/infra/`, `scripts/ops/`, `scripts/tenant/` | Agrupación ADR-032 (preferir aquí scripts nuevos) |
| `scripts/utils/` | Utilidades (`update-state.js`, etc.) |

## Raíz del repo y CI

- **`config/root-whitelist.json`**: en CI (`validate-structure-strict`) solo carpetas/archivos listados o patrones permitidos. Añadir en raíz algo nuevo → actualizar whitelist o mover fuera de raíz.
- **`scripts/validate-structure.js`**: exige `runtime/`, `tools/cli`, … y **prohíbe** carpetas en raíz con nombres `agents`, `logs`, `tenants`, `letsencrypt`, `workspaces`, `cli` (deben vivir bajo `tools/` o `runtime/`).

## Comandos útiles

```bash
npm run type-check
npm run validate-structure
npm run validate-openapi
npm run validate-skills
npm run sync-agents
```

Última revisión del mapa: 2026-04-30.
