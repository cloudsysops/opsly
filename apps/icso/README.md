# ICSO Marketing Site

Public agency website for **IntCloud SysOps (ICSO)** — AI automation positioning.

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

## Scope

Marketing site plus **lead intake API** (`POST /api/leads`) plus **commercial catalog**
(`content/commercial-catalog.json` ↔ `config/commercial-catalog.json`):

- Packages (Basic / Hybrid / Custom / Managed)
- Reusable Opsly modules
- Verticals ready to clone (`swim-school`, `whatsapp-first`, …)

Sell flow: pick package or vertical on the site → contact form prefilled → CRM lead.

| Capa | Ruta / artefacto | Notas |
|------|------------------|--------|
| Operativa | Supabase `intcloudsysops_*` | Fuente de verdad (requiere service role en runtime) |
| CRM | Twenty REST | Primario cuando `INTCLOUDSYSOPS_TWENTY_ENABLED` + credenciales |
| Legacy | GoHighLevel agency | Solo si `INTCLOUDSYSOPS_GHL_ENABLED=true` (default **false**) |

Runbook: [`docs/tenants/intcloudsysops/TWENTY-CRM.md`](../../docs/tenants/intcloudsysops/TWENTY-CRM.md).  
No incluye Opsly checkout ni tenant apps de clientes.
