# Overnight — Content Studio render/kit (sin contexto de chat)

Eres OpenCode en el worktree overnight. No force-push. No edites `main`. PR en rama `overnight/*`.
Primero: git pull --ff-only (los scripts de pipeline pueden haber cambiado).

Tarea de esta noche:
1. Revisa `config/content-studio/channels/splashitos/` — ¿hay batches cuyo kit aún no
   existe en `runtime/content-studio/youtube-upload-kit/splashitos/`?
2. Si hay guiones pendientes, corre el autopilot consolidado:
     ./scripts/ops/content-autopilot.sh --channel splashitos --dry-run   # preflight
     doppler run --project ops-intcloudsysops --config prd -- \
       ./scripts/ops/content-autopilot.sh --channel splashitos --kit
   (enqueue render a content-video → espera renders → genera el kit de subida).
3. Si no hay guiones pendientes en splashitos, repite con `--channel bitsitos`.
4. Deja un resumen en un PR draft (o comentario si no hay cambios de código) de qué
   se renderizó y qué queda pendiente de aprobación humana en el kit de subida.
   NO uses --auto-publish ni --upload: la subida a YouTube es decisión humana en el
   kit (approval-first), salvo AUTO_PUBLISH_YOUTUBE=true explícito que tú no activas.

No hay guion nuevo que escribir esta noche salvo que se te indique explícitamente
en el prompt de la tarea — esta plantilla es solo para render/pipeline, no para
generar contenido nuevo sin dirección de marca.
