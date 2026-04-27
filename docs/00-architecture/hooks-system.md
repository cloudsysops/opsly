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
| `./runtime/logs//`            | `./runtime/logs//`              | Bloqueado |
| `./runtime/tenants//`         | `./runtime/tenants//`           | Bloqueado |
| `./runtime/letsencrypt//`     | `./runtime/letsencrypt//`       | Bloqueado |
| `tools/tools/agents/prompts`     | `tools/tools/tools/agents/prompts`         | Bloqueado |
| `tools/workspaces/` (raíz) | `tools/tools/workspaces/`            | Bloqueado |
| `tools/cli/` (raíz)        | `tools/tools/cli/`                   | Bloqueado |
| `/opt/opsly/runtime/logs/`    | `/opt/opsly/runtime/logs/`      | Bloqueado |
| `/opt/opsly/runtime/tenants/` | `/opt/opsly/runtime/tenants/`   | Bloqueado |

## Flujo de Trabajo

1. Antes de commit los hooks validan automáticamente.
2. Si hay error, corregir referencias/rutas reportadas.
3. Para migraciones de estructura, ejecutar `npm run sync-references`.
4. Confirmar con `npm run test-structure`.

## Whitelist de Archivos en Raíz

Para mantener la raíz del proyecto limpia, solo los archivos explícitamente permitidos pueden existir en el directorio raíz.

### Ver archivos permitidos

```bash
npm run whitelist:list
```

### Añadir archivo permitido

```bash
npm run whitelist:add NUEVO_ARCHIVO.md
```

### Verificar si un archivo está permitido

```bash
npm run whitelist:check MI_ARCHIVO.md
```

### Archivo de configuración

La whitelist se configura en `config/root-whitelist.json`.

### Bypass de emergencia

Si necesitas añadir un archivo temporal que no debería estar en la whitelist:

```bash
git commit --no-verify
```

Usar con moderación. Los archivos temporales deberían ir en `docs/` o `tools/`.
