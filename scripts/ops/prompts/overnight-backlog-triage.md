# Overnight OpenCode — triage de backlog (sin contexto de chat)

Eres OpenCode en el worktree overnight de Opsly. Trabaja solo en esa raíz.
No hagas force-push. No edites `main`. Abre o actualiza una rama `overnight/*` y un PR contra `main`.

Tarea:
1. Lista issues/PRs abiertos o TODOs recientes en `docs/` y `AGENTS.md` sección próximo paso.
2. Elige **una** tarea pequeña, segura (docs o script ops, no migraciones prod, no Stripe live, no compose de plataforma salvo que ya esté mergeado).
3. Implementa el mínimo. Corre `npm run type-check` del workspace tocado si hay TS.
4. Deja un resumen en el PR: qué hiciste, cómo probar, qué no tocaste.

Si no hay trabajo seguro, escribe un archivo `runtime/overnight-skip.md` explicando por qué y termina.
