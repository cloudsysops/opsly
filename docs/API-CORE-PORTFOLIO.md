# Portafolio API — plano canónico vs `apps/web`

## Plano canónico

- **`apps/api`** — única fuente de verdad HTTP para la plataforma (tenants, webhooks, métricas, claves, público acotado).

## `apps/web` (legacy / transición)

Las rutas bajo `apps/web/app/api/**` son **proxies** hacia `apps/api` cuando existe paridad. Configuración:

- `INTERNAL_API_URL` (preferido en Docker) o `NEXT_PUBLIC_API_URL`
- Cabecera de depuración en respuesta: `x-opsly-web-proxy: 1`

Detalle de mapeo y riesgos: [TENANT-PRODUCTION-BASELINE.md](./TENANT-PRODUCTION-BASELINE.md).

## Rutas añadidas en consolidación

| Método | Ruta API | Uso |
| ------ | -------- | --- |
| GET | `/api/metrics/web-dashboard` | Métricas anidadas (ex-`apps/web` `/api/metrics`). |
| GET | `/api/public/tenants/status` | Estado onboarding por `?email=` + rate limit Redis. |
| GET, POST | `/api/v1/keys` | API keys por cabecera `x-tenant-id` (deuda de hardening documentada). |
| DELETE | `/api/v1/keys/{id}` | Revocar clave. |
