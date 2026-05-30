---
status: draft
owner: platform
last_review: 2026-05-28
type: tenant
---

# Panini Lab — tenant incubado (demo conversacional)

**URL producción:** [https://panini.op-sly.com](https://panini.op-sly.com)  
**Tipo:** Demo / hackathon — **no** stack tenant completo (sin n8n/uptime por defecto)  
**App:** `apps/panini-lab` (Next.js, puerto **3005**)  
**Schema Supabase:** `panini_lab` (migraciones `0067`, `0068`)

## Qué es

Laboratorio de la capa **conversational runtime**: webhook inbound, parsing de figuritas Mundial 2026, dashboard con voz y progreso por país. Sirve como tenant piloto del motor reutilizable (`packages/opsly-core` + `lib/conversational-runtime`).

## Infra en producción

| Pieza | Ubicación |
| --- | --- |
| Imagen GHCR | `ghcr.io/cloudsysops/intcloudsysops-panini-lab:latest` |
| Compose | `infra/docker-compose.panini-lab.yml` |
| Traefik | `infra/traefik/dynamic/panini-lab.yml` → `Host(\`panini.op-sly.com\`)` |
| Deploy CI | `.github/workflows/deploy-panini-lab.yml` (post-merge `main`) |
| Go-live | [`docs/runbooks/PANINI-LAB-GOLIVE.md`](../../runbooks/PANINI-LAB-GOLIVE.md) |

## API

| Método | Ruta | Auth |
| --- | --- | --- |
| `POST` | `/api/webhooks/inbound` | Header `x-panini-webhook-secret` (prod) |
| `GET` | `/dashboard` | NextAuth Google si `GOOGLE_CLIENT_*` configurado |
| `GET` | `/analytics` | Idem |

## Comandos locales

```bash
npm run dev --workspace=@intcloudsysops/panini-lab
npm run opsly:panini:test
npm run opsly:verify:core
```

## Smoke producción

```bash
./scripts/test-panini-lab-smoke.sh
```

## Config tenant

Metadata: [`config/tenants/panini-lab.json`](../../../config/tenants/panini-lab.json)  
Runtime config: `apps/panini-lab/config/tenant.config.ts`

## Roadmap

Ver [`docs/00-architecture/conversational-runtime-roadmap.md`](../../00-architecture/conversational-runtime-roadmap.md) — Sprint 4 (demo concurso en prod).
