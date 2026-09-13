---
status: draft
owner: operations
last_review: 2026-09-12
type: guide
tags:
  - opsly/development
---

# Cola de prompts para agentes (local / Cursor)

Objetivo: que **desde el móvil o el equipo** se dejen instrucciones en git y el agente en Cursor las **encuentre, ejecute y deje constancia** de forma ordenada.

## Modelo canónico actual

Opsly ya no depende de mantener Cursor/OpenCode abierto ni de agentes AI persistentes.

La cola entra por el camino gobernado:

```text
tracked night-queue / local queue
→ LocalPromptWatcher / governed submit
→ AgentTaskEnvelopeV1
→ BullMQ local-agents
→ authenticated CLI bridge
→ Session Manager
→ ephemeral tmux opsly-task-*
→ real runtime
→ result/evidence
→ teardown
```

Invariantes:
- el checkout automático solo confía en la rama configurada (por defecto `main`);
- `PLATFORM_ADMIN_TOKEN` es obligatorio;
- no se ejecuta Markdown como shell;
- el runtime AI nace por tarea y se destruye al terminar;
- estado sano en idle = **0 sesiones `opsly-task-*`**;
- no hay fallback silencioso a payloads legacy salvo break-glass explícito y temporal.

## Rutas recomendadas

| Rol | Ruta | Notas |
|-----|------|--------|
| Prompts **pendientes** | `.cursor/prompts/queue/*.md` | Un archivo = una tarea; nombre `NNN-breve-titulo.md` (NNN = 001, 002…). |
| Prompts **hechos** (archivo) | `.cursor/prompts/done/` | Tras completar: **mover** el `.md` de `queue/` → `done/` (o renombrar con prefijo `done-`). |
| **Respuesta del agente** | Mismo archivo, sección final *o* par `queue/001-x.md` + `queue/001-x.response.md` | Elige **una** convención por repo y cúmplela siempre. |

Convención **recomendada en este repo**: respuesta **al final del mismo archivo** en una sección fija (menos archivos sueltos).

## Formato del prompt (cabecera YAML mínima)

Al inicio del `.md` en `queue/`:

```yaml
---
id: local-services-001
status: pending
owner: optional-github-handle
created: 2026-05-03
requires_pr: true
---
```

Cuerpo: instrucciones en Markdown (qué construir, rutas, criterios de hecho).

## Dónde y cómo **dejar la respuesta** (obligatorio para el agente)

Al terminar (o si bloquea), el agente **añade** al mismo archivo (debajo del cuerpo original, sin borrar el pedido):

```markdown
---

## Respuesta agente (ISO-8601 UTC)

- **Estado:** hecho | parcial | bloqueado
- **Rama / PR:** …
- **Commits:** …
- **Qué se hizo:** …
- **Qué falta / riesgos:** …
- **Cómo verificar:** comandos o URLs
```

Luego:

1. Si `requires_pr: true` y hay cambios: **PR** según `docs/01-development/GIT-WORKFLOW.md`.
2. Cambiar en la cabecera `status: done` (o mover el archivo a `done/` si preferís solo estado por ruta).

## Cómo disparar una pasada

El dispatcher sincroniza de forma fast-forward-only la rama confiable, si el árbol está limpio, y siembra la cola local desde los workpacks versionados:

```bash
./scripts/ops/dispatch-prompt-queue.sh
```

Para inspeccionar sin ejecutar:

```bash
./scripts/ops/dispatch-prompt-queue.sh --dry-run
```

El dispatcher **no abre Terminal ni arranca un CLI AI persistente**. Verifica el camino gobernado y deja la ejecución real al worker/bridge/Session Manager.

## Servicios locales permitidos

El repo incluye un watcher mantenido:

```bash
PLATFORM_ADMIN_TOKEN="<token>" \
ORCHESTRATOR_URL="http://localhost:3011" \
npm run opsly:local-prompt-watcher
```

Comportamiento:

- Escucha `.cursor/prompts/queue/*.md`.
- Procesa todos los prompts con `status: pending` al arrancar y luego los nuevos cambios.
- Lee `docs/01-development/ACTIVE-PROMPT.md` como contexto operativo para cada job.
- Envía el contenido a `POST /api/local/prompt-submit`; **no ejecuta bloques shell del Markdown**.
- Hace polling de `/api/job-status/{job_id}`.
- Añade la sección `## Respuesta agente (...)` en el mismo archivo y cambia `status` a `done` o `failed`.

Para procesar una sola pasada y salir:

```bash
PLATFORM_ADMIN_TOKEN="<token>" npm run opsly:local-prompt-watcher:once
```


## Puesta en marcha del nodo Mac

Después de instalar/bootstrappear los servicios persistentes permitidos, el gate físico final es:

```bash
doppler run --project ops-intcloudsysops --config prd -- npm run opsly:mac:go-live
```

Ese comando verifica en una sola pasada:

1. readiness doctor sin blockers;
2. cero sesiones AI antes de empezar;
3. control plane + cola `local-agents`;
4. submit gobernado;
5. ejecución real vía runtime efímero;
6. polling de estado;
7. evidencia bounded local;
8. teardown;
9. retorno a cero sesiones `opsly-task-*`.

Un PASS de CI no sustituye este smoke físico. El nodo no se considera E2E validado hasta obtener evidencia desde el Mac real.

## Detección manual sin peligro

- **Opcional:** script solo lectura que lista el siguiente pendiente (para humano o para pegar salida en el chat):

```bash
./scripts/next-prompt-in-queue.sh
```

Prompts versionados para la noche: `docs/01-development/night-queue/` — `dispatch-prompt-queue.sh` los copia a `.cursor/prompts/queue/` (gitignored) y usa el camino gobernado del orchestrator. n8n: `docs/n8n-workflows/night-agent-queue.json` (HTTP al orchestrator; **no** escribe `docs/ACTIVE-PROMPT.md`).

Si no existe el script, basta con listar la carpeta `queue/` manualmente; el protocolo sigue siendo válido.

## Relación con otras carpetas

- `.cursor/prompts/*.md` **fuera** de `queue/` pueden ser **plantillas o referencia** (no son tarea hasta que alguien copie o enlace desde `queue/`).
- No confundir con **skills** (`skills/user/…`): la cola es **tareas puntuales** del producto/sprint; las skills son procedimiento reutilizable.

---

## Enlaces relacionados

- [[01-development/README|01-development]]
- [[brain/README|Brain Central]]
