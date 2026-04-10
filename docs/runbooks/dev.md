# Runbook — Desarrollo local (Opsly)

**Audiencia:** desarrolladores del monorepo.

## Requisitos

- Node y npm (workspaces + Turbo)
- Opcional: Docker para compose local
- Doppler CLI para secretos (config `stg` / `prd` según tarea)

## Arranque rápido

1. `npm ci` en la raíz
2. Copiar `.env.example` → `.env.local` (o usar `./scripts/local-setup.sh`); rellenar con `doppler run` o valores no secretos solo para dev
3. `npm run dev` — levanta workspaces configurados en Turbo

## Calidad antes de PR

- `npm run lint`
- `npm run type-check`
- `npm run test`

## Hooks Git

- `git config core.hooksPath .githooks` — pre-commit type-check; post-commit sincroniza contexto cuando aplica

## API y tenants en local

- Rutas bajo `apps/api/app/api/`; tests Vitest en `**/*.test.ts`
- Sin Docker local, el orquestador que invoca `docker` puede fallar; usar tests con mocks o entorno compose (`infra/docker-compose.local.yml`)

## Referencias

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/TEST_PLAN.md`
