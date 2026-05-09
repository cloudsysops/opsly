# Structure guardrails (Opsly)

## Multi-tenant y API

- **Plano HTTP canónico:** `apps/api/app/api/**`.
- **`apps/web/app/api/**`:** mantener como **proxies** hacia el API salvo excepción documentada; ver [`API-CORE-PORTFOLIO.md`](./API-CORE-PORTFOLIO.md) y [`TENANT-PRODUCTION-BASELINE.md`](./TENANT-PRODUCTION-BASELINE.md).

## Producción por tenant

- Checklist única: [`TENANT-PRODUCTION-CHECKLIST.md`](./TENANT-PRODUCTION-CHECKLIST.md).
- Rollout por cohortes: [`TENANT-PRODUCTION-ROLLOUT.md`](./TENANT-PRODUCTION-ROLLOUT.md).

## Otros

- Validación de estructura del repo (p. ej. árbol Obsidian): `npm run validate-structure` cuando esté definido en `package.json`.
