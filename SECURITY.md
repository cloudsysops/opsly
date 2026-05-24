---
status: draft
owner: operations
last_review: 2026-05-24
type: doc
tags:
  - opsly/doc
---

# Security Policy — Opsly

## Supported versions

| Branch / entorno | Soporte de parches de seguridad |
| ---------------- | ------------------------------- |
| `main` (producción Opsly) | Sí — prioridad operativa |
| Ramas `feat/*` / `fix/*` abiertas | Solo durante el PR activo |
| Tags o releases antiguos sin mantenimiento | No |

## Reportar una vulnerabilidad

**No** abras un issue público con detalles de explotación, credenciales ni datos de clientes.

1. Envía un reporte privado al equipo de operaciones (canal acordado con el responsable del repo).
2. Incluye: impacto, pasos para reproducir, versión/commit afectado y mitigación sugerida si la tienes.
3. Espera acuse de recibo en un plazo orientativo de **72 h hábiles**; el tiempo de corrección depende de severidad y superficie (multi-tenant, API, VPS, secretos Doppler).

## Alcance típico

- Acceso no autorizado a tenants, API admin/portal, MCP u orquestador.
- Exposición de secretos en código, logs, commits o documentación.
- Bypass de Zero-Trust en rutas `/api/portal/tenant/[slug]/*`.
- SSH, Traefik o Redis expuestos fuera de la política (Tailscale + Cloudflare; ver `docs/04-infrastructure/SECURITY_CHECKLIST.md`).

## Documentación interna

| Recurso | Ruta |
| ------- | ---- |
| Checklist operativo | [`docs/04-infrastructure/SECURITY_CHECKLIST.md`](docs/04-infrastructure/SECURITY_CHECKLIST.md) |
| Mitigaciones VPS / red | [`docs/04-infrastructure/SECURITY-MITIGATIONS-2026-04-09.md`](docs/04-infrastructure/SECURITY-MITIGATIONS-2026-04-09.md) |
| Guardrails para agentes | [`docs/03-agents/AGENT-GUARDRAILS.md`](docs/03-agents/AGENT-GUARDRAILS.md) |
| Auditorías | [`docs/security/`](docs/security/) |

## Secretos

Los secretos viven en **Doppler** (`ops-intcloudsysops/prd`); nunca en el repositorio ni en issues/PRs.

---

## Enlaces relacionados

- [[README|.]]
- [[README|Inicio]]
