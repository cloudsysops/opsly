# Quality gates — Opsly monorepo

> Objetivo: calidad predecible **sin** duplicar hooks ni inventar comandos que no existan en `package.json`.

## Ya integrado en el repo

| Mecanismo                                                 | Qué hace                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [`.githooks/pre-commit`](.githooks/pre-commit)            | `npm run type-check` (Turbo) + ESLint en archivos **staged** bajo `apps/api/app` y `apps/api/lib` |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Type-check, tests por workspaces, validaciones                                                    |
| Reglas TypeScript                                         | Sin `any` (API y convención Opsly)                                                                |

**Hooks:** `git config core.hooksPath .githooks` (si no están activos).

**No añadir Husky** en paralelo a `.githooks` sin eliminar duplicación: un solo sistema de pre-commit.

## Comandos estándar (raíz del repo)

```bash
npm run type-check    # Turbo — obligatorio antes de merge
npm run test          # Turbo — tests de workspaces
npm run validate-openapi
npm run validate-skills
```

**ESLint estricto** en API: solo lo que cubre el hook para `apps/api` staged; otros workspaces tienen reglas propias.

## Checklist antes de merge (PR)

- [ ] `npm run type-check` verde localmente.
- [ ] Tests del workspace tocado verdes (p. ej. `npm run test --workspace=@intcloudsysops/llm-gateway`).
- [ ] Sin secretos en diff; sin `console.log` de depuración en código de producción.
- [ ] Funciones nuevas en API: preferir &lt; ~50 líneas o extraer helpers (convención Opsly).
- [ ] Si cambia contrato HTTP u OpenAPI: actualizar `docs/openapi-opsly-api.yaml` y `npm run validate-openapi`.
- [ ] Decisiones de arquitectura: mencionar en `AGENTS.md` si aplica.

## Cobertura

El monorepo **no** exige un umbral global del 80% en CI para todos los paquetes; los incrementos suben cobertura por workspace según prioridad. No bloquear PR solo por métrica artificial si el módulo aún no tiene baseline.

## Workflows adicionales

Evitar workflows que filtren por rutas **inexistentes** (`apps/orchestrator/src/hermes*`) — rompen CI o nunca se ejecutan. Ampliar [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) con cuidado y paths reales.

## Referencias

- [`docs/CURSOR-DAILY-CHECKLIST.md`](CURSOR-DAILY-CHECKLIST.md)
- [`SPRINT-TRACKER.md`](../SPRINT-TRACKER.md)
