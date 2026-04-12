# Auto-sync de documentación (implementation status)

Sistema para mantener **estado de implementación** alineado al código sin editar Markdown a mano.

## 1. Fuente de verdad: `docs/implementation/status.yaml`

- Un solo archivo YAML con fases, componentes, bloqueos y próximos pasos.
- Campos principales:
  - `project`, `last_commit`, `last_updated` (los dos últimos los puede actualizar CI).
  - `phases[]`: `number`, `name`, `status` (`PLANNED` | `IN_PROGRESS` | `DONE` | `BLOCKED`), fechas, `description`, `components[]`, `dependencies[]`.
  - Cada `component`: `name`, `file`, `status` (texto libre, p. ej. `✅ DONE`), `description`, `methods[]` opcional, `pr`, `commit`.
  - `blockers[]`: `title`, `severity` (`CRITICAL` | `HIGH` | `MEDIUM`), `fix`, `status` (`OPEN` | `RESOLVED`).
  - `next_steps[]`: strings (se renderizan como checklist en el Markdown).

## 2. Generador: `npm run docs:sync`

- Script: `scripts/sync-docs.js` (usa `js-yaml`).
- Salida: **`docs/IMPLEMENTATION-STATUS.md`** (sobrescrito siempre).
- **No edites** `IMPLEMENTATION-STATUS.md` manualmente: se regenera.

## 3. Flujo local

1. Editá `docs/implementation/status.yaml`.
2. Ejecutá `npm run docs:sync`.
3. Revisá `docs/IMPLEMENTATION-STATUS.md`.
4. Hacé commit de **ambos** archivos (o dejá que el pre-commit añada el `.md` si solo staged el YAML).

### Pre-commit (`.githooks/pre-commit`)

El repo usa `git config core.hooksPath .githooks` (ver README). Si **solo** agregás al stage `docs/implementation/status.yaml`, el hook ejecuta `docs:sync` y hace `git add` de `docs/IMPLEMENTATION-STATUS.md`.

### Watch opcional

```bash
npm run docs:watch
```

Regenera al guardar `status.yaml` (requiere `nodemon`).

### Husky (opcional)

Si usás Husky en vez de `.githooks`, existe `.husky/pre-commit` que delega en `.githooks/pre-commit`.

## 4. GitHub Actions: `.github/workflows/sync-docs.yml`

- Se dispara en **push a `main`** cuando cambian rutas relevantes (`status.yaml`, worker, migraciones, scripts, etc.).
- Pasos: `npm ci` → `node scripts/patch-status-yaml-ci.js` (rellena `last_commit` / `last_updated` con el SHA del workflow) → `npm run docs:sync` → commit + push si hay diff.
- **Anti-bucle:** no corre si el mensaje del último commit contiene `[docs-sync]` (commits automáticos del bot).
- **Discord:** si el repo tiene el secreto `DISCORD_WEBHOOK_URL`, envía un embed verde con enlace al Markdown en GitHub. Si falta el secreto, el workflow sigue sin fallar.

## 5. Añadir un componente nuevo

1. Editá la fase correspondiente en `status.yaml` y agregá un ítem en `components`.
2. `npm run docs:sync`.
3. Commit de `status.yaml` + `IMPLEMENTATION-STATUS.md`.

## 6. Secreto GitHub `DISCORD_WEBHOOK_URL`

1. Abrí: `https://github.com/cloudsysops/opsly/settings/secrets/actions` (sustituí org/repo si aplica).
2. **New repository secret**.
3. Nombre: `DISCORD_WEBHOOK_URL`.
4. Valor: URL del webhook del canal Discord (Opsly).
5. Guardar. Sin webhook, la notificación se omite.

## 7. Troubleshooting

| Problema | Qué hacer |
|----------|-----------|
| `docs:sync` falla | Validá sintaxis YAML (indentación, comillas en fechas ISO). |
| No llega notificación a Discord | Comprobá que exista `DISCORD_WEBHOOK_URL` en Secrets del repo. |
| El workflow no corre | Revisá que el push incluya algún path listado en `on.push.paths` del workflow. |
| “Auto-commit loop” | No uses `git push --force` para “arreglar”. El diseño evita bucles con `[docs-sync]` en el mensaje del commit automático. |
| Pre-commit no regenera docs | Verificá `core.hooksPath=.githooks` y que `status.yaml` esté en el stage. |

## 8. Prueba rápida

```bash
npm run test:docs
```

Equivale a `scripts/test-sync-docs.sh`: corre `docs:sync` y valida que el Markdown contenga fases y tabla de timestamps.
