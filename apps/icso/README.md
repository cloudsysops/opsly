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

Frontend-only marketing app. Does not include Opsly checkout, API routes, GHL, or tenant apps.
