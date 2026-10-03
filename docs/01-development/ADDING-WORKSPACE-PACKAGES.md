---
status: canon
owner: operations
last_review: 2026-09-30
type: doc
tags:
  - opsly/doc
  - opsly/development
---

# Agregar un package/app nuevo al workspace de npm

Descubierto en PR #1681 (primer tenant del vertical `gaming-streamer`): agregar
`apps/opsafterdark` y `packages/stream-ops-kit` como miembros nuevos del
workspace rompió el CI del repo de dos formas no obvias. Ambas fallan en
silencio si no se conocen de antemano.

## 1. `workspace:*` no funciona — el CI de este repo usa `npm`, no `pnpm`

Aunque existe `pnpm-workspace.yaml` en la raíz, `.github/workflows/ci.yml` y
`structure-validation.yml` corren `npm ci`. La sintaxis `"paquete": "workspace:*"`
en `dependencies` es de pnpm/yarn — `npm ci` falla con
`EUNSUPPORTEDPROTOCOL: Unsupported URL Type "workspace:": workspace:*`.

**Si un package interno depende de otro del monorepo, no declares la
dependencia en `package.json` con `workspace:*`.** En su lugar, hasta que haya
un ADR que resuelva esto de fondo: usa una ruta relativa de import directa
(`import { x } from '../../../packages/otro-paquete/src/archivo.mjs'`) o
confirma primero si el paquete realmente necesita ser instalable como
dependencia de otro, o si basta con que ambos sean miembros del workspace sin
declarar la relación en `dependencies`.

## 2. `npm ci` exige que `package-lock.json` esté sincronizado

Agregar un `package.json` nuevo bajo `apps/*` o `packages/*` (glob ya cubierto
por el `workspaces` del `package.json` raíz) requiere regenerar el
`package-lock.json` raíz — `npm ci` falla con `EUSAGE` si no coinciden.

**No corras `npm install` con cualquier versión local de Node/npm para esto.**
El CI fija `node-version: '20'` (ver `ci.yml`). Regenerar el lockfile con una
versión distinta (probado: Node v26 local vs Node 20 del CI) produce miles de
líneas de diff no relacionadas — resoluciones de dependencias opcionales/
peer distintas por versión de Node, no cambios reales.

Proceso verificado que funciona:

1. Descargar el binario exacto de Node que usa el CI (`node-version` en los
   workflows) si no está disponible localmente — no hace falta instalarlo
   globalmente, alcanza con extraer el tarball y anteponerlo al `PATH` para
   este comando puntual.
2. `npm install --package-lock-only --ignore-scripts` con ese Node exacto
   (el `--ignore-scripts` evita que corra el `postinstall` de build de todo
   el monorepo, que no hace falta para solo actualizar el lockfile).
3. **Revisar el diff antes de commitear.** Si el package nuevo no tiene
   dependencias externas, el diff esperado es pequeño: una entrada en
   `packages` por cada nuevo miembro del workspace + su symlink en
   `node_modules/@scope/nombre`. Si el diff es de miles de líneas, algo no
   coincide con el entorno del CI — no commitear a ciegas; extraer a mano
   solo las entradas nuevas relevantes y aplicarlas sobre el lockfile
   original sin tocar el resto (splicing por línea, no regenerar todo el
   archivo).
4. Verificar con `npm ci --ignore-scripts` (exit 0) antes de dar por
   resuelto — no alcanza con que `npm install` no tire error.

## 3. `AGENTS.md` exige que cada `apps/*` esté mencionado ahí

Un check de CI (`validate` / "Servicios documentados en AGENTS.md") falla si
`apps/<nombre>` no aparece como substring en algún lugar de `AGENTS.md`. Se
verifica así, y se puede correr localmente antes de abrir PR:

```bash
FAIL=0
for app in apps/*/; do
  name=$(basename "$app")
  grep -q "$name" AGENTS.md || { echo "❌ apps/$name no está en AGENTS.md"; FAIL=1; }
done
[ "$FAIL" -eq 0 ] && echo "✅ Todos los servicios documentados"
```

Agregar una fila a la tabla de servicios locales de `AGENTS.md` (buscar la
sección donde están `apps/ai-dj`, `apps/panini-lab`, etc.) es suficiente.

## Related

- [[brain/README|Opsly Brain]]
- PR #1681 (primer tenant `gaming-streamer`, donde se descubrió esto)
- PR #1682 (auditoría del backlog de PRs que motivó revisar coordinación entre agentes)
