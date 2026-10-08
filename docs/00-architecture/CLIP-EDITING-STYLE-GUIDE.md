---
status: canon
owner: content-studio
last_review: 2026-10-08
type: architecture
tags:
  - opsly/content-studio
  - opsly/airsoft
  - opsly/opsafterdark
---

# Clip Editing Style Guide / Guía de Estilos de Edición

**Parent:** [CONTENT-PIPELINE-CANONICAL.md](CONTENT-PIPELINE-CANONICAL.md) — this doc extends the canonical
pipeline with an **editing-style selection layer** between `highlight.detect` and the export/publish stages.
It does **not** introduce a new highlight engine, a new clip source, or a new approval model — those stay
exactly as defined in the parent doc. This is editorial criteria, consumed by:

- the human editor (Cristian, learning DaVinci Resolve) when cutting a clip by hand, and
- any future automation in `lib/content-studio` that proposes an `editingStyle` for a candidate clip —
  additive metadata on the existing `ProjectClip`/`HighlightCandidate` shape, not a parallel pipeline.

No clip auto-publishes from this layer. `PUBLISH=LOCKED` / human approval (see parent doc, "Approval model")
is unchanged and still applies to every output described here.

---

## EN — Why this exists

Every clip generated so far (see the 2026-10-06 Airsoft review package) used the same cut:
**hook → zoom → kill → big text → cut**. That's fine once; repeated across 20+ Shorts it reads as a template,
which hurts retention and makes the channel forgettable. This guide is the fix: a small set of **distinct
editing structures**, rules for **when to vary** them, and a **required variety check** before anything goes
to the approval queue.

## ES — Por qué existe

Todos los clips generados hasta ahora (ver el paquete de revisión de Airsoft 2026-10-06) usaron el mismo
corte: **hook → zoom → kill → texto grande → corte**. Una vez está bien; repetido en 20+ Shorts se siente
plantilla, baja retención y hace el canal olvidable. Esta guía es la corrección: un set pequeño de
**estructuras de edición distintas**, reglas de **cuándo variar**, y una **verificación de variedad
obligatoria** antes de que algo llegue a la cola de aprobación.

---

## 1. Core rule / Regla principal

**EN** — Each clip must pick a structure based on what actually happened in the footage, not on habit.
Never default to hook → zoom → kill → text → cut for every clip.

**ES** — Cada clip debe elegir una estructura según lo que realmente pasó en la grabación, no por costumbre.
Nunca usar por defecto hook → zoom → kill → texto → corte en todos los clips.

## 2. The 8 structures / Las 8 estructuras

| # | Style | EN — when to use | ES — cuándo usarla |
|---|-------|-------------------|----------------------|
| 1 | **COLD OPEN** | Start at the strongest moment, no intro, then rewind 2–4s to show the setup. | Empieza en el momento más fuerte, sin intro; retrocede 2–4s para mostrar cómo se llegó ahí. |
| 2 | **BUILD-UP** | Calm start, rising tension via ambient sound/look/movement/wait, payoff = kill / squad wipe / explosion / scoreboard. | Inicio tranquilo, tensión creciente (ambiente, mirada, movimiento, espera), remate = kill / squad wipe / explosión / scoreboard. |
| 3 | **PAYOFF FIRST** | Open with the result ("10 KILLS CONFIRMED", "SQUAD ELIMINATED", "TOP 6"), then show how it happened. | Abre con el resultado, después muestra cómo ocurrió. |
| 4 | **FAST MONTAGE** | Several 0.5–2s actions, cut-to-rhythm, no long pauses. Best for sniper streaks / multi-kill runs. | Varias acciones de 0.5–2s, cortes al ritmo, sin pausas largas. Ideal para rachas de sniper. |
| 5 | **CINEMATIC** | Fewer cuts, more ambience/fire/explosions/game audio, slow-motion reserved for exactly one key moment. | Menos cortes, más ambiente/fuego/explosiones/audio del juego, slow motion solo en un momento clave. |
| 6 | **REACTION / WTF** | Highlights something unexpected: 0.3–0.6s freeze, punch zoom, short text ("¿QUÉ ACABA DE PASAR?", "NADIE SOBREVIVIÓ"). | Resalta algo inesperado: freeze 0.3–0.6s, punch zoom, texto corto. |
| 7 | **MINI STORY** | situación → problema → acción → resultado. Must read even to someone who never saw the stream. | situación → problema → acción → resultado. Debe entenderse sin haber visto el stream. |
| 8 | **POV / IMMERSIVE** | Minimal text, game audio/shots/movement carries it, clean HUD — feels like an experience, not a meme. | Textos mínimos, prioriza audio del juego/disparos/movimiento, HUD limpio — experiencia, no meme. |

## 3. Pacing / Ritmo

- First second must contain movement, a result, danger, or strong text — never a slow fade-in.
  *Primer segundo con movimiento, resultado, peligro o texto fuerte — nunca un fade-in lento.*
- Cut dead silence; don't cut every second just because — let tension breathe when the scene needs it.
  *Eliminar silencios muertos; no cortar cada segundo si la escena necesita tensión.*
- Alternate frenetic clips with cinematic ones across a batch — don't publish five FAST MONTAGE in a row.
  *Alternar clips frenéticos con cinematográficos en un lote — no publicar cinco FAST MONTAGE seguidos.*
- Speed ramp only when it serves the moment; don't overuse slow motion.
  *Speed ramp solo cuando tenga sentido; no abusar del slow motion.*

## 4. Zoom & camera movement / Zoom y movimiento

Vary between: short punch zoom · progressive crop · stable camera · target tracking · freeze frame.
Max 2–3 strong zooms per Short, except FAST MONTAGE.

*Variar entre: punch zoom corto · crop progresivo · cámara estable · tracking del objetivo · freeze frame.
Máximo 2–3 zooms fuertes por Short, salvo FAST MONTAGE.*

## 5. Text / Texto

Don't default to giant centered subtitles on every clip. Alternate: opening headline · small subtitles ·
side-aligned text · stat marker · no text during the action beat. Keep text to **2–7 words**.

Examples / Ejemplos: "10 BAJAS. PRIMERA PARTIDA." · "EL SQUAD DESAPARECIÓ" · "NO DEBÍ ASOMARME" ·
"SNIPER ONLY" · "TODO ESTÁ ARDIENDO"

*No usar siempre subtítulos enormes centrados. Alternar: headline inicial · subtítulos pequeños · texto
lateral · marcador estadístico · ningún texto durante la acción. Textos de 2–7 palabras.*

## 6. Audio / Audio

Prioritize original game audio — shots, impacts, explosions, reloads, ambience. Add music only when it
improves rhythm. Use SFX/impact hits sparingly, not on every cut.

*Priorizar audio original del juego — disparos, impactos, explosiones, recargas, ambiente. Añadir música
solo cuando mejore el ritmo. SFX puntuales, no en cada corte.*

## 7. Hooks / Ganchos

Never repeat the same hook back to back. Alternate: question · statistic · result · provocative line ·
immediate action · loud audio · unexpected image.

*No repetir el mismo hook. Alternar: pregunta · estadística · resultado · frase provocadora · acción
inmediata · audio fuerte · imagen inesperada.*

## 8. Format & duration / Formato y duración

- 9:16, 1080×1920. Keep the action in the mobile-safe zone — never cover sight/enemy/hitmarker/scoreboard.
- Duration follows content, not a quota: 8–15s simple moments · 15–30s full plays · 30–45s mini-stories.
  Never pad a clip just to hit a target length.

*9:16, 1080×1920. Mantener la acción en zona segura para móvil — no tapar mira, enemigo, hitmarker ni
scoreboard. La duración sigue al contenido: 8–15s momentos simples · 15–30s jugadas completas · 30–45s
mini-historias. No alargar un clip solo para llegar a una duración fija.*

## 9. Variety check (required before approval queue) / Verificación de variedad (obligatoria)

Before a clip enters the approval queue (`review/` per the parent doc), check the **last 5 published
clips** and confirm this one does not repeat all of: same hook type, same zoom pattern, same text layout,
same music choice, same transition, same structure (1–8 above). If 3+ of those match, pick a different
style for this clip.

*Antes de que un clip entre a la cola de aprobación (`review/` según el doc padre), revisar los **últimos
5 clips publicados** y confirmar que éste no repite todo: mismo tipo de hook, mismo patrón de zoom, mismo
layout de texto, misma música, misma transición, misma estructura (1–8). Si coinciden 3 o más, elegir otro
estilo.*

## 10. Required per-clip report / Reporte obligatorio por clip

Every clip submitted to review must carry this block (bilingual labels, content in either language is
fine) so the reviewer can see the editorial reasoning, not just the cut:

```
STYLE:
HOOK:
DURATION:
EDITING_PATTERN:
TEXT:
AUDIO:
PAYOFF:
WHY_DIFFERENT_FROM_LAST_CLIPS:
```

For the best moment in a session, produce **two versions** when it's worth the editor's time:
`A` = aggressive/fast cut, `B` = cinematic/tension cut. Both go to `review/` for approval — **never
auto-publish** (unchanged from the parent doc's approval model).

*Para el mejor momento de una sesión, producir **dos versiones** cuando valga la pena: `A` = agresiva/rápida,
`B` = cinematográfica/tensión. Ambas van a `review/` para aprobación — **nunca publicación automática**
(sin cambios respecto al modelo de aprobación del doc padre).*

## 11. Where this plugs into the canonical pipeline

This guide governs the editorial choices made during the existing `extractClip` → `verticalReframe` →
`captionBurn` stages (see parent doc, "Canonical pipeline"). It does not add a stage, a worker, or a queue.
When editing is automated further, the natural home for an `editingStyle` field is the same
`HighlightCandidate` / `ProjectClip` shape already extended for `session-window` in
`lib/content-studio/src/content-engine/types.ts` — add it there as an optional enum (one of the 8 styles
above) rather than building a second decision layer. **No new engine, no new agent** — same rule as
`highlight.detect` in the parent doc.

---

## Enlaces relacionados

- [[CONTENT-PIPELINE-CANONICAL]]
- [[MISSION-CONTROL-KIT]]
