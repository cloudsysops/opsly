# Sistema de Hooks de Integridad

## Propósito

Garantizar que cualquier cambio de estructura del repositorio se propague correctamente y que no se reintroduzcan referencias obsoletas.

## Instalación

```bash
npm run install-hooks
```

## Hooks Instalados

### `pre-commit`

- Valida estructura mínima con `npm run validate-structure`.
- Ejecuta guardián referencial para rutas legacy.
- Bloquea commits que violen la estructura.

### `pre-push`

- Ejecuta validación extendida antes de push.
- Repite guardián de estructura y referencias.

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
| `./logs/`            | `./runtime/logs/`              | Bloqueado |
| `./tenants/`         | `./runtime/tenants/`           | Bloqueado |
| `./letsencrypt/`     | `./runtime/letsencrypt/`       | Bloqueado |
| `agents/prompts`     | `tools/agents/prompts`         | Bloqueado |
| `workspaces/` (raíz) | `tools/workspaces/`            | Bloqueado |
| `cli/` (raíz)        | `tools/cli/`                   | Bloqueado |
| `/opt/opsly/logs`    | `/opt/opsly/runtime/logs`      | Bloqueado |
| `/opt/opsly/tenants` | `/opt/opsly/runtime/tenants`   | Bloqueado |

## Flujo de Trabajo

1. Antes de commit los hooks validan automáticamente.
2. Si hay error, corregir referencias/rutas reportadas.
3. Para migraciones de estructura, ejecutar `npm run sync-references`.
4. Confirmar con `npm run test-structure`.

## Whitelist de Raíz

La whitelist vive en `config/root-whitelist.json` y controla:

- Archivos permitidos en raíz (`allowed_files`)
- Carpetas permitidas en raíz (`allowed_folders`)
- Carpetas ocultas permitidas (`allowed_hidden_folders`)
- Patrones bloqueados (`blocked_patterns`, `blocked_hidden_patterns`)

### Comandos útiles

```bash
npm run whitelist:list
npm run whitelist:add NUEVO_ARCHIVO.md
npm run whitelist:check README.md
node scripts/manage-whitelist.js add-folder nueva-carpeta
node scripts/manage-whitelist.js remove-folder carpeta-obsoleta
node scripts/manage-whitelist.js add-hidden .nueva-carpeta
node scripts/manage-whitelist.js remove-hidden .nueva-carpeta
```
