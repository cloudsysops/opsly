# ICSO Marketing Site

Public site for **IntCloud SysOps (ICSO)** — the AI agency. **Opsly** is ICSO's
multi-tenant operating system (not a separate company): modules, tenants, CRM, and
governed agents that ICSO sells and operates.

## Dev

```bash
npm run dev --workspace=@intcloudsysops/icso
```

Open http://localhost:3015

## Build

```bash
npm run build --workspace=@intcloudsysops/icso
npm run type-check --workspace=@intcloudsysops/icso
```

## Brand assets

- App: `public/brand/` (served at `/brand/*`)
- Canonical copies: `docs/brand/icso/` (GHL upload / handoff)

## Deploy (VPS)

- Image: `ghcr.io/cloudsysops/intcloudsysops-icso:latest`
- Compose service `icso` in `infra/docker-compose.platform.yml` (port **3015**)
- Traefik hosts: `ICSO_DOMAIN` (default `intcloudsysops.com`)
- Doppler optional: `ICSO_APP_IMAGE`, `ICSO_DOMAIN`, `NEXT_PUBLIC_SITE_URL`

## Env (server)

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPSLY_API_URL` | `http://127.0.0.1:3000` | Base URL of `apps/api` for live catalog (`GET /api/icso/catalog/public`) |

In Compose, `icso` uses `OPSLY_API_URL=http://app:3000` so catalog edits from admin apply without rebuilding the ICSO image.

## Scope

Marketing site plus **lead intake API** (`POST /api/leads`) plus **commercial catalog**
(source of truth: `config/commercial-catalog.json`, edited via admin `/icso-catalog`):

- Packages (Basic / Hybrid / Custom / Managed)
- Reusable Opsly modules
- Verticals ready to clone (`swim-school`, `whatsapp-first`, …)

Sell flow: pick package or vertical on the site → contact form prefilled → CRM lead.

| Capa | Ruta / artefacto | Notas |
|------|------------------|--------|
| Operativa | Supabase `intcloudsysops_*` | Fuente de verdad (requiere service role en runtime) |
| CRM | Twenty REST | Primario cuando `INTCLOUDSYSOPS_TWENTY_ENABLED` + credenciales |

Runbook: [`docs/tenants/intcloudsysops/TWENTY-CRM.md`](../../docs/tenants/intcloudsysops/TWENTY-CRM.md).  
No incluye Opsly checkout ni tenant apps de clientes.
