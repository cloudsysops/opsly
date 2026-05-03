# Cola de prompts para agentes (local / Cursor)

Objetivo: que **desde el móvil o el equipo** se dejen instrucciones en git y el agente en Cursor las **encuentre, ejecute y deje constancia** de forma ordenada.

## Límites honestos (importante)

- **Cursor no ejecuta prompts solo** mientras el IDE está cerrado: hace falta **abrir una sesión** y disparar la cola (mensaje en el chat o `@archivo`).
- **No** reutilizar en local el patrón del VPS `docs/ACTIVE-PROMPT.md` + `cursor-prompt-monitor` para ejecutar líneas como shell sin revisión: es **riesgo RCE** si alguien malicioso puede editar el repo.
- Lo que sí podemos es: **convención de carpetas + formato + una frase fija** en el chat para que el agente lea la cola y responda en el sitio acordado.

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

## Cómo **disparar** la ejecución en Cursor (local)

En el chat, una sola línea (copiable desde el móvil):

```text
Ejecuta la cola de prompts: lee .cursor/prompts/queue/, elige el primero con status pending, sigue docs/01-development/AGENT-PROMPT-QUEUE.md y deja la sección «Respuesta agente».
```

O abrir un prompt concreto:

```text
@.cursor/prompts/queue/001-mi-tarea.md Ejecuta y deja respuesta según AGENT-PROMPT-QUEUE.md
```

## Detección “automática” sin peligro

- **Opcional:** script solo lectura que lista el siguiente pendiente (para humano o para pegar salida en el chat):

```bash
./scripts/next-prompt-in-queue.sh
```

Si no existe el script, basta con listar la carpeta `queue/` manualmente; el protocolo sigue siendo válido.

## Relación con otras carpetas

- `.cursor/prompts/*.md` **fuera** de `queue/` pueden ser **plantillas o referencia** (no son tarea hasta que alguien copie o enlace desde `queue/`).
- No confundir con **skills** (`skills/user/…`): la cola es **tareas puntuales** del producto/sprint; las skills son procedimiento reutilizable.
