# Checklist — Tenant listo para producción (Opsly)

> **Canónico (runbooks):** editar este archivo. Stub: [`docs/TENANT-PRODUCTION-CHECKLIST.md`](../TENANT-PRODUCTION-CHECKLIST.md).

Criterios verificables antes de marcar un tenant como **prod-ready**. Aplicar por fila en `platform.tenants` + stack Compose del slug.

## Identidad y datos

| # | Criterio | Evidencia / comando |
| - | -------- | ------------------- |
| 1 | Fila en `platform.tenants` con `slug`, `owner_email`, `plan`, `status=active` (o el estado acordado) | Supabase SQL / API admin |
| 2 | Sin `deleted_at` ni drift de email frente a invitaciones | Revisión admin |
| 3 | Schema tenant `tenant_{slug}` o política RLS alineada a ADR | Migraciones aplicadas |

## Red y DNS

| # | Criterio | Evidencia |
| - | -------- | --------- |
| 4 | Wildcard `*.{PLATFORM_DOMAIN}` resuelve al edge (Traefik) | `dig` / panel DNS |
| 5 | TLS válido en n8n y Uptime del tenant | Navegador / `curl -I` |
| 6 | Cloudflare Proxy ON si aplica (ocultar origen) | Panel CF |

## Stack por tenant

| # | Criterio | Evidencia |
| - | -------- | --------- |
| 7 | Contenedores n8n + Uptime del proyecto `tenant_{slug}` **healthy** | `docker compose ps` en VPS |
| 8 | URLs en DB/API coinciden con plantilla (`n8n-{slug}`, `uptime-{slug}`) | Portal `GET /api/portal/.../me` |
| 9 | Backups / volúmenes documentados según runbook plataforma | `docs/runbooks/` |

## Seguridad y acceso

| # | Criterio | Evidencia |
| - | -------- | --------- |
| 10 | SSH administrativo solo Tailscale (no exposición credenciales en repo) | `docs/SECURITY_CHECKLIST.md` |
| 11 | Portal: rutas `/api/portal/tenant/[slug]/*` con Zero-Trust | Tests API |
| 12 | Admin: mutaciones con sesión/token según política actual | Smoke manual |

## API y proxy

| # | Criterio | Evidencia |
| - | -------- | --------- |
| 13 | `apps/web` con `INTERNAL_API_URL` o `NEXT_PUBLIC_API_URL` hacia API | Variables deploy |
| 14 | `GET /api/health` (API) OK desde el borde | `curl` público |
| 15 | Tras `POST /api/tenants`, fila visible en `GET /api/tenants` | E2E |

## Costos y operación

| # | Criterio | Evidencia |
| - | -------- | --------- |
| 16 | Plan y límites alineados a `VISION.md` / contrato | Registro interno |
| 17 | Presupuesto LLM / alertas si el tenant usa gateway | Admin costs / métricas |

## Cierre

- **Firma:** responsable + fecha (ticket o `AGENTS.md` sesión).
- **Rollback:** ver [TENANT-PRODUCTION-ROLLOUT.md](./TENANT-PRODUCTION-ROLLOUT.md).

## Referencias

- [TENANT-PRODUCTION-BASELINE.md](../04-infrastructure/TENANT-PRODUCTION-BASELINE.md)
- [TENANT-PRODUCTION-HARDENING.md](../04-infrastructure/TENANT-PRODUCTION-HARDENING.md)
- [TENANT-ONBOARDING-TRIAGE.md](./TENANT-ONBOARDING-TRIAGE.md)
