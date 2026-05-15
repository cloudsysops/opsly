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
- `PRODUCTION-STATUS-2026-05-15.md`
- `DOMAIN-CUTOVER-OP-SLY.md`
- `MCP-ORCHESTRATOR-DEPLOYMENT.md`
- `PRODUCTION-READINESS.md`
- [`../tenants/production/TENANT-PRODUCTION-BASELINE.md`](../tenants/production/TENANT-PRODUCTION-BASELINE.md) — inventario multi-tenant + mapa web→API (stub en esta carpeta)
- [`../tenants/production/TENANT-PRODUCTION-HARDENING.md`](../tenants/production/TENANT-PRODUCTION-HARDENING.md) — controles de seguridad prod (stub en esta carpeta)
- [`REDIS-QUEUE-GUIDE.md`](REDIS-QUEUE-GUIDE.md) — Redis, BullMQ y colas del orchestrator (stub histórico: [`../infrastructure/REDIS-QUEUE-GUIDE.md`](../infrastructure/REDIS-QUEUE-GUIDE.md))
