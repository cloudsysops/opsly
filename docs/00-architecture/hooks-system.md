---
status: draft
owner: operations
last_review: 2026-05-24
type: architecture
tags:
  - opsly/architecture
---

# Sistema de Hooks de Integridad

## Propósito

Garantizar que cualquier cambio de estructura del repositorio se propague correctamente y que no se reintroduzcan referencias obsoletas.

## Instalación

```bash
npm run install-hooks
```

## Hooks Instalados

### `pre-commit` (lightweight — ver PR #493)

- `npm run validate-structure` — raíz completa + hubs `docs/`.
- `scripts/hooks/structure-guard.sh` — rutas legacy, whitelist staged, **contaminación en raíz** (`.py`, imágenes, `.env*`, JSON no allowlisted).
- Tests diff-scoped en `lib/*` cuando aplica.
- **No** type-check global ni lint --fix (eso va en pre-push / CI).

### `pre-push` (heavy scoped)

- Type-check, OpenAPI, skills manifest cuando cambian paths relevantes.
- Ver `scripts/hooks/hook-bootstrap.sh` para PATH node/npm.

## Validación Manual

```bash
# Validar estructura básica
npm run validate-structure

# Test de integridad completo
npm run test-structure

# Sincronizar referencias después de cambio de estructura
npm run sync-references
```

## Rutas Protegidas

| Ruta Antigua         | Ruta Nueva                     | Estado    |
| -------------------- | ------------------------------ | --------- |
| `./runtime/logs/`            | `./runtime/logs/`              | Bloqueado |
| `./runtime/tenants/`         | `./runtime/tenants/`           | Bloqueado |
| `./runtime/letsencrypt/`     | `./runtime/letsencrypt/`       | Bloqueado |
| `tools/agents/prompts`     | `tools/tools/agents/prompts`         | Bloqueado |
| `workspaces/` (raíz) | `tools/workspaces/`            | Bloqueado |
| `cli/` (raíz)        | `tools/cli/`                   | Bloqueado |
| `/opt/opsly/runtime/logs`    | `/opt/opsly/runtime/logs`      | Bloqueado |
| `/opt/opsly/runtime/tenants` | `/opt/opsly/runtime/tenants`   | Bloqueado |

## Flujo de Trabajo

1. Antes de commit los hooks validan automáticamente.
2. Si hay error, corregir referencias/rutas reportadas.
3. Para migraciones de estructura, ejecutar `npm run sync-references`.
4. Confirmar con `npm run test-structure`.

## CI Validation

Every PR is automatically validated against structure rules.

### Local validation

```bash
npm run validate:strict
```

### CI validation (strict mode)

In CI mode, warnings become errors. Any file/folder not in whitelist fails the build.

```bash
npm run validate:strict:ci
```

### What CI validates

1. Required directories exist.
2. No forbidden directories in root.
3. All files in root are whitelisted.
4. All folders in root are whitelisted.
5. All hidden folders are authorized.
6. No legacy path references.
7. Symlink status report.

---

## Enlaces relacionados

- [[00-architecture/README|00-architecture]]
- [[brain/README|Brain Central]]
