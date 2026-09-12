---
status: draft
owner: operations
last_review: 2026-05-24
type: guide
tags:
  - opsly/development
---

# Cola de prompts para agentes (local / Cursor)

Objetivo: que **desde el móvil o el equipo** se dejen instrucciones en git y el agente en Cursor las **encuentre, ejecute y deje constancia** de forma ordenada.

## Estado actual y límites

- La cola **sí puede ejecutarse sin copiar manualmente cada prompt** cuando el dispatcher local y `scripts/local-prompt-watcher.ts` están activos.
- GitHub es la fuente durable de tareas versionadas; `.cursor/prompts/queue/` es una cola local derivada y gitignored.
- El dispatcher debe sincronizar el repo de forma segura antes de sembrar la cola local; nunca debe hacer reset/merge destructivo sobre un árbol sucio.
- **No** ejecutar bloques shell contenidos en Markdown como si fueran comandos confiables. El watcher envía la tarea al Orchestrator, que aplica auth/policy/runtime controls.
- Si el dispatcher/watchers no están activos, el fallback sigue siendo ejecución manual desde Cursor/Claude/Codex.

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

## Ejecución manual de respaldo

En el chat, una sola línea (copiable desde el móvil):

```text
Ejecuta la cola de prompts: lee .cursor/prompts/queue/, elige el primero con status pending, sigue docs/01-development/AGENT-PROMPT-QUEUE.md y deja la sección «Respuesta agente».
```

O abrir un prompt concreto:

```text
@.cursor/prompts/queue/001-mi-tarea.md Ejecuta y deja respuesta según AGENT-PROMPT-QUEUE.md
```

## Daemon local seguro

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

## Detección manual sin peligro

- **Opcional:** script solo lectura que lista el siguiente pendiente (para humano o para pegar salida en el chat):

```bash
./scripts/next-prompt-in-queue.sh
```

Prompts versionados: `docs/01-development/night-queue/` es la cola durable en GitHub. `scripts/ops/dispatch-prompt-queue.sh` sincroniza el repo de forma segura, copia tareas pendientes a `.cursor/prompts/queue/` (gitignored) y dispara la ruta local existente. n8n: `docs/n8n-workflows/night-agent-queue.json` puede llamar al orchestrator; **no** escribe `docs/ACTIVE-PROMPT.md`.

Si no existe el script, basta con listar la carpeta `queue/` manualmente; el protocolo sigue siendo válido.

## Relación con otras carpetas

- `.cursor/prompts/*.md` **fuera** de `queue/` pueden ser **plantillas o referencia** (no son tarea hasta que alguien copie o enlace desde `queue/`).
- No confundir con **skills** (`skills/user/…`): la cola es **tareas puntuales** del producto/sprint; las skills son procedimiento reutilizable.

---

## Enlaces relacionados

- [[01-development/README|01-development]]
- [[brain/README|Brain Central]]


## Control loop canónico

El flujo completo y las reglas de builder/reviewer, máquinas, seguridad, merge y notificaciones están en `docs/00-architecture/ENGINEERING-CONTROL-LOOP.md`.
