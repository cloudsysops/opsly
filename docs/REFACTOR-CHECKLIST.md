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
