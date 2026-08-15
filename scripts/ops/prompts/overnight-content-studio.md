# Overnight — Content Studio render/kit (sin contexto de chat)

Eres OpenCode en el worktree overnight. No force-push. No edites `main`. PR en rama `overnight/*`.

Tarea de esta noche:
1. Revisa `config/content-studio/channels/splashitos/` — ¿hay batches de guiones sin
   renderizar todavía en `runtime/content-studio/youtube-upload-kit/splashitos/`?
2. Si hay guiones pendientes, corre el pipeline de render local
   (`scripts/content-studio-enqueue.sh --channel splashitos`) y confirma que el kit
   de subida se generó correctamente (`content-factory-bootstrap.sh`).
3. Si no hay guiones pendientes, revisa `config/content-studio/channels/bitsitos/`
   por el mismo criterio.
4. Deja un resumen en un PR draft (o comentario si no hay cambios de código) de qué
   se renderizó y qué queda pendiente de aprobación humana en el kit de subida.

No hay guion nuevo que escribir esta noche salvo que se te indique explícitamente
en el prompt de la tarea — esta plantilla es solo para render/pipeline, no para
generar contenido nuevo sin dirección de marca.
