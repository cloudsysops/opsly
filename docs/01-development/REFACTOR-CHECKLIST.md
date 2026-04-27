# Refactor Checklist (Monorepo)

## Alcance aplicado

- `apps/api`: parseo de JSON unificado en rutas con helper compartido.
- `apps/portal` y `apps/admin`: utilidades HTTP consolidadas para reducir duplicación.
- `apps/mcp`, `apps/orchestrator`, `apps/ml`: tipos/contratos reforzados y pruebas ampliadas.
- `deploy.yml`: reducción de duplicación en comandos compose del deploy remoto.

## Verificaciones requeridas

- `npm run type-check`
- `npm run test -w @intcloudsysops/mcp`
- `npm run test -w @intcloudsysops/orchestrator`
- `npm run test -w @intcloudsysops/ml`

## Criterios de salida

- Sin regresiones en rutas API públicas.
- Sin cambios de contrato en autenticación/headers.
- Deploy workflow mantiene build + pull + health check existentes.

## Variables manuales (owner)

Configurar estos secretos/variables fuera de código:

- `GITHUB_TOKEN` (o legado `GITHUB_TOKEN_N8N`; ver `docs/GITHUB-TOKEN.md`)
- `GOOGLE_DRIVE_TOKEN`
- `RESEND_API_KEY` (real, no placeholder)
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_STARTUP`
- `STRIPE_PRICE_ID_BUSINESS`
- `STRIPE_PRICE_ID_ENTERPRISE`
- `STRIPE_PRICE_ID_DEMO`

Comandos de referencia:

```bash
doppler secrets set GITHUB_TOKEN --project ops-intcloudsysops --config prd
doppler secrets set GOOGLE_DRIVE_TOKEN --project ops-intcloudsysops --config prd
doppler secrets set RESEND_API_KEY --project ops-intcloudsysops --config prd
doppler secrets set STRIPE_SECRET_KEY --project ops-intcloudsysops --config prd
doppler secrets set STRIPE_PRICE_ID_STARTUP --project ops-intcloudsysops --config prd
doppler secrets set STRIPE_PRICE_ID_BUSINESS --project ops-intcloudsysops --config prd
doppler secrets set STRIPE_PRICE_ID_ENTERPRISE --project ops-intcloudsysops --config prd
doppler secrets set STRIPE_PRICE_ID_DEMO --project ops-intcloudsysops --config prd
```

## OpenClaw readiness (Claude MCP)

- `npm run type-check -w @intcloudsysops/mcp`
- `npm run test -w @intcloudsysops/mcp`
- `npm run test -w @intcloudsysops/orchestrator`
- `npm run build -w @intcloudsysops/mcp`
- Confirmar endpoint/transporte MCP configurado en cliente Claude.
