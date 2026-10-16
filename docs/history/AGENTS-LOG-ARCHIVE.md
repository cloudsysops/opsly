---
status: archive
owner: operations
last_review: 2026-10-08
---

# Opsly — AGENTS.md Log Archive (índice)

> Archivo histórico. `AGENTS.md` crecio a 2853 lineas / ~297KB — la mayor parte era un log
> append-only de resumenes de sesiones pasadas (2026-04 a 2026-09-15). Esta compactacion
> (2026-10-08, sesion `session_01893z4opJe7nVSeTwQseFJk`, PR de revision para Cristian por
> tratarse de un doc CANONICAL/protegido) movio ese log, **verbatim, sin resumir ni recortar**,
> a los archivos listados abajo, y dejo en `AGENTS.md` solo la seccion `## Estado actual`
> con el estado mas reciente real.
>
> Para sesiones anteriores a 2026-05-26, ver tambien el archivo previo
> [`AGENTS-SESSION-HISTORY.md`](AGENTS-SESSION-HISTORY.md) (ya existia antes de esta
> compactacion y cubre un subconjunto de sesiones de 2026-04/05).

## Archivos de este archivo (orden cronologico del contenido)

| Archivo | Contenido | Rango de fechas |
|---|---|---|
| [`agents-log/2026-04-peskids-content-studio-decisiones.md`](agents-log/2026-04-peskids-content-studio-decisiones.md) | Peskids Phase 1-2 · Content Studio Phase 2 · Evaluación de Seguridad y Multi-Tenancy · tabla "Decisiones tomadas en sesiones anteriores" | 2026-04-04 → 2026-08-25 |
| [`agents-log/estado-actual-2026-04-a-2026-09-10.md`](agents-log/estado-actual-2026-04-a-2026-09-10.md) | Sección "🔄 Estado actual" completa: Sesión Activa, Sesiones Recientes, Sprint activo, Semana 2 (Ollama/NotebookLM), Ecosistema OpenClaw, Brain Automation, Próximo paso inmediato, Bloqueantes activos | 2026-04-04 → 2026-09-10 |
| [`agents-log/estado-actual-2026-05-21-a-2026-09-15.md`](agents-log/estado-actual-2026-05-21-a-2026-09-15.md) | Secuencia de secciones "🔄 Estado Actual (YYYY-MM-DD — …)", una por sesión cerrada | 2026-05-21 → 2026-09-15 |

## Qué se preservó explícitamente (no perder en futuras ediciones)

Notas operativas / lecciones-aprendidas encontradas durante la auditoría, dispersas en el log
original y preservadas verbatim en los archivos de arriba — no reescribir estas lecciones,
solo enlazarlas:

- **`.claude-scratch/` en la raíz del repo** rompe el hook `pre-push` de validación de
  estructura para *cualquier* push, no solo el de esa carpeta — nunca escribir fuera del
  scratchpad de la sesión. (`estado-actual-2026-05-21-a-2026-09-15.md`, sesión 2026-09-13.)
- **Revisar la columna *staged* de `git status --short` línea por línea antes de commitear**,
  no asumir que "lo que yo agregué" es lo único que queda staged — un commit puede arrastrar
  archivos staged de antes por error. (`estado-actual-2026-05-21-a-2026-09-15.md`, sesión
  2026-09-15, PR #1600 Ghostty.)
- **WSL2 no soporta `nvidia-smi` persistence-mode** (`-q -d PERSISTENCE_MODE` /
  `--query-gpu=persistence_mode` hacen segfault por la paravirtualización de GPU) — no
  recomendar esa opción en workers WSL2. (`estado-actual-2026-05-21-a-2026-09-15.md`, sesión
  2026-09-15.)
- **Causa raíz de la duplicación Mauro/content-engine (PRs #1155/#1158 vs. trabajo en
  paralelo):** no fue falta de una regla ("reuse first" ya existía en CLAUDE.md), fue que
  nadie actualizó `AGENTS.md` al cerrar sesión — el mecanismo de coordinación existía pero no
  se usaba. (`estado-actual-2026-05-21-a-2026-09-15.md`, sesión 2026-09-11.)
- **Dos motores de contenido paralelos sin consolidar:** `lib/content-engine` (canónico,
  registrado) vs. `lib/content-studio/src/content-engine` (usado por Mauro, no registrado) —
  ver `docs/adr/ADR-058-content-engine-duplication.md`. Consolidación deliberadamente
  diferida por falta de ffmpeg real en el sandbox de esa sesión.

---

*Para el estado operativo actual, ver [`AGENTS.md`](../../AGENTS.md).*
