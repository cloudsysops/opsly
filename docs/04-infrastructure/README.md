---
status: canon
owner: operations
last_review: 2026-05-09
---

# Infrastructure MOC

Infraestructura de plataforma: VPS, Docker, Traefik, Cloudflare, Tailscale, Redis, Doppler, GCP y workers.

## Qué va aquí

- Configuración técnica e infraestructura.
- Topologías, variables, servicios y hardening.
- Documentos de despliegue técnico que no son pasos de incidente.

## Qué no va aquí

- Runbooks accionables de operación diaria; usar `../runbooks/`.
- Arquitectura conceptual general; usar `../00-architecture/`.

## Documentos clave

- `VPS-ARCHITECTURE.md`
- `DOMAIN-CUTOVER-OP-SLY.md`
- `MCP-ORCHESTRATOR-DEPLOYMENT.md`
- `PRODUCTION-READINESS.md`
- `TENANT-PRODUCTION-BASELINE.md` — inventario multi-tenant + mapa web→API
- `TENANT-PRODUCTION-HARDENING.md` — controles de seguridad prod
