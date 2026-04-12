# Setup Notion MCP — Paso a paso

## Arranque rápido con Doppler

Con `NOTION_TOKEN` y los cinco `NOTION_DATABASE_*` ya en **Doppler** `ops-intcloudsysops` / `prd`:

```bash
npm run dev:notion-mcp
curl -s http://127.0.0.1:3013/ready | python3 -m json.tool
```

Si `/ready` devuelve `status: ok` y los títulos de las bases, la integración y los IDs están bien.

## Pre-requisitos

- [ ] Cuenta Notion (free o de pago)
- [ ] Token de integración Notion (`secret_…`)
- [ ] Node.js 20+ (recomendado vía `nvm`)
- [ ] Repo Opsly clonado
- [ ] Doppler CLI autenticada (mismo proyecto/config que el resto de Opsly)

---

## Paso 1: Página / workspace en Notion

1. Abre [notion.so](https://www.notion.so).
2. Crea una página raíz, p. ej. **Opsly Planning**.
3. Las bases de datos pueden vivir como subpáginas; los **IDs** se copian desde la URL de cada base (ver paso 5).

---

## Paso 2: Crear las 5 bases de datos

Replica las propiedades descritas en [NOTION-MCP-SERVER.md](./NOTION-MCP-SERVER.md). Los **nombres de propiedad** deben coincidir con `apps/notion-mcp/src/constants.ts` o debes ajustar ese archivo.

**Notas:**

- En Tasks, la columna título suele llamarse **Name** (tipo title).
- Las relaciones (Tasks ↔ Sprints) requieren que ambas bases existan antes de enlazarlas.

---

## Paso 3: Crear integración Notion

1. [My integrations](https://www.notion.so/my-integrations)
2. **New integration** → nombre: `Opsly MCP`
3. Copia el **Internal Integration Secret** → `NOTION_TOKEN` en `.env`

---

## Paso 4: Conectar la integración a cada base

En cada base de datos:

1. Menú **···** → **Connections** (o **Add connections**)
2. Selecciona **Opsly MCP** y confirma.

Sin este paso, la API devuelve `object_not_found` / `unauthorized`.

---

## Paso 5: Copiar IDs a `.env`

Abre la base como página completa. La URL tiene forma:

```text
https://www.notion.so/workspace/<DATABASE_ID>?v=...
```

El `DATABASE_ID` es un UUID con guiones; también puedes usar el formato de 32 caracteres sin guiones según la API.

Copia en `apps/notion-mcp/.env` (partiendo de `.env.example`):

```bash
NOTION_DATABASE_TASKS=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NOTION_DATABASE_SPRINTS=...
NOTION_DATABASE_STANDUP=...
NOTION_DATABASE_QUALITY=...
NOTION_DATABASE_METRICS=...
MCP_PORT=3013
```

---

## Paso 6: Instalar y arrancar

```bash
cd apps/notion-mcp
cp .env.example .env
# Editar .env con token e IDs

npm install
npm run dev
```

Esperado en consola: servidor escuchando en el puerto configurado (p. ej. 3013).

---

## Paso 7: Pruebas

```bash
curl -sS http://localhost:3013/health

curl -sS -X POST http://localhost:3013/mcp/tasks/list \
  -H "Content-Type: application/json" \
  -d '{}'
```

Si la base Tasks está vacía, `count` será `0` y `tasks` un array vacío.

---

## Paso 8: Docker (opcional)

Puedes añadir un servicio en `infra/docker-compose.platform.yml` apuntando al `Dockerfile` del paquete (si existe) o usando `node` + build multi-stage. Variables: mismas que `.env`. Red interna según tu diseño (p. ej. `internal`); **no** publiques el puerto a Internet sin autenticación.

---

## Paso 9: Uso en Cursor

En el chat puedes indicar tareas con contexto Notion:

```text
Tarea: T1.1 — revisa el estado en Notion (sprint Semana 1, columna Ready).
Cuando termines el cambio en código, actualiza la tarea a In Review vía API del equipo o el endpoint /mcp/tasks/update expuesto en el entorno local.
```

Cursor no llama solo al HTTP; o bien usas **MCP** configurado en el IDE apuntando a un servidor MCP compatible, o ejecutas los `curl`/`fetch` desde un script que tú o el agente lance. Este repo entrega primero el **servicio HTTP** en `apps/notion-mcp`.

---

## Solución de problemas

| Síntoma | Acción |
|---------|--------|
| 401 / object_not_found | Conectar integración a la base (paso 4) y revisar IDs |
| Propiedades no encontradas | Alinear nombres con `constants.ts` |
| people / Owner vacío | Los IDs de usuario Notion son distintos a email; rellenar en UI o pasar IDs válidos en create |
