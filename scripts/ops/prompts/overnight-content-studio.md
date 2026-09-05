# Overnight — Content Studio render/kit (sin contexto de chat)

Eres OpenCode en el worktree overnight. No force-push. No edites `main`. PR en rama `overnight/*`.
Primero: git pull --ff-only (los scripts de pipeline pueden haber cambiado).

Tarea de esta noche:
1. Revisa `config/content-studio/channels/bitsitos/` — ¿hay batches cuyo kit aún no
   existe en `runtime/content-studio/youtube-upload-kit/bitsitos/`?
2. Si hay guiones pendientes, el render es **solo PC-gamer** (no arrancar MoneyPrinter en Mac):
     ./scripts/ops/check-pc-gamer-online.sh --json
     ./scripts/ops/content-autopilot.sh --channel bitsitos --dry-run   # preflight
     doppler run --project ops-intcloudsysops --config prd -- \
       ./scripts/ops/content-autopilot.sh --channel bitsitos --kit
   Si el gamer está offline: aborta (exit 2). No uses --allow-mac-render.
3. Si no hay guiones pendientes en bitsitos, repite con `--channel splashitos`.
4. Deja un resumen en un PR draft (o comentario si no hay cambios de código) de qué
   se renderizó y qué queda pendiente de aprobación humana en el kit de subida.
   NO uses --auto-publish ni --upload: la subida a YouTube es decisión humana en el
   kit (approval-first), salvo AUTO_PUBLISH_YOUTUBE=true explícito que tú no activas.

No hay guion nuevo que escribir esta noche salvo que se te indique explícitamente
en el prompt de la tarea — esta plantilla es solo para render/pipeline, no para
generar contenido nuevo sin dirección de marca.
