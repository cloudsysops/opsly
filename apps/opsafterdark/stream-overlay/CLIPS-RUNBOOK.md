---
status: active
owner: opsafterdark
last_review: 2026-10-02
related: ["#1681", "#1692"]
---
# OpsAfterDark — Runbook de clips (Twitch → TikTok / YouTube Shorts / Instagram Reels)

Pasos verificados en vivo el 2026-10-01/02. Cualquier agente puede seguirlos.
**Regla de oro:** el humano aprueba lo que se publica. Nunca escribir credenciales, nunca iniciar sesión por el operador.

## 0. Prerrequisitos (comprobar, no asumir)
| Qué | Dónde comprobar | Estado esperado |
|---|---|---|
| Sesión Twitch `opsafterdark` | dashboard.twitch.tv carga sin pedir login | Si pide login → STOP, pedir al operador |
| Conexiones | Twitch → Configuración → Conexiones | YouTube `opsafterdarktv`, TikTok `opsafterdark.op`, Instagram `opsafterdark` = conectadas |
| Instagram | cuenta **profesional (Creador)** | Requerido para exportar Reels |
| No estar en vivo para tocar OBS | OBS → botón "Start Streaming" (no "Stop") | Clips sí se pueden hacer en vivo; OBS no |

## 1. Elegir el momento (el punto que más falla)
- **Vibe coding solo se ve si la terminal ocupa espacio en pantalla.** En los VODs del 28–30 sep el código estaba en una ventana de ~500 px abajo-derecha ("PC Performance"); el recorte vertical lo pierde y, aun en modo dividido, sale ilegible.
- Preferir momentos grabados en la escena OBS **Coding** (terminal 65 % + Mission Control 35 %) o **OAD_FACTORY_FOCUS**.
- Antes de recortar, mirar un fotograma del minuto (abrir `twitch.tv/videos/<ID>?t=1h45m10s` y capturar). Si no se ve código → es clip de **gameplay**, titularlo como tal; no prometer vibe coding.
- El clip toma ~30 s **terminando en la posición del reproductor** → poner `t=` unos 10 s después del momento clave.
- Revisar que no salga nada privado (pestañas, terminal con env/tokens, notificaciones).

## 2. Crear el clip en Twitch
1. `https://www.twitch.tv/videos/<VOD_ID>?t=<HhMmSs>` (IDs en Estudio de vídeo; VODs caducan ~7 días, los **Destacados** no).
2. Botón **Clip (alt+x)** → panel "Crear clip".
3. **Versión vertical → Editar**:
   - Icono **izquierdo** = encuadre único (un recuadro celeste).
   - Icono **derecho** = **dividido**: recuadro **rosa** = mitad superior, **celeste** = mitad inferior.
   - Para vibe coding: rosa sobre la terminal/Mission Control, celeste sobre el juego. Arrastrar desde el centro del recuadro.
   - **Guardar** (o Cancelar si el contenido no sirve).
4. Título (obligatorio, máx. 100): `<gancho> | OpsAfterDark` → **Guardar clip**.

## 3. Exportar a las 3 redes en una pasada
*Panel de creador → Contenido → Clips* → icono **Compartir** del clip → **TikTok**. El diálogo "Exportar clip" encadena las redes: al publicar una se abre la **siguiente**.
1. **TikTok** (texto ≤150 car., incluye hashtags): Privacidad *Público*, ✅ Permitir comentarios → **Publicar en TikTok**.
2. **YouTube** (título ≤100 con `#shorts`; descripción con link a Twitch y redes) → **Compartir en YouTube**. ⚠️ El botón se desplaza tras publicar TikTok: re-localizarlo antes de pulsar.
3. **Instagram** (caption multilínea, ✅ "Muestra este reel en tu página") → **Compartir en Instagram**. Tarda 1–3 min; cerrar el diálogo **no** interrumpe.
4. Snapchat: no conectado (ignorar).

### Plantillas de texto
- TikTok: `<gancho> <emoji> Live: twitch.tv/opsafterdark #battlefield6 #bf6 #vibecoding #ia #gaming` (3–5 hashtags)
- YouTube título: `<gancho> <emoji> #shorts` · descripción: 1 línea + `En vivo en Twitch: https://www.twitch.tv/opsafterdark` + `TikTok: @opsafterdark.op · Instagram: @opsafterdark` + hashtags
- Instagram: `<gancho>` ⏎ `Vibe coding con IA + Battlefield 6 en vivo → twitch.tv/opsafterdark` ⏎ hashtags

## 4. Verificar y reportar (no declarar hecho sin esto)
- YouTube: link `youtube.com/shorts/<id>` que muestra el diálogo.
- TikTok: el diálogo solo da el perfil → sacar el link del video desde `tiktok.com/@opsafterdark.op` (enlaces `/video/<id>`, más recientes primero).
- Instagram: `instagram.com/opsafterdark/reels/` (enlaces `/reel/<id>`).
- Reportar tabla: clip | TikTok | Shorts | Reels | hora (ET).

## 5. Cadencia
1 clip/día en las 3 redes > 5 de golpe. Serie recurrente sugerida: "Agente vs Bug" (escena Coding).

## Errores conocidos
- Clip sin vibe coding → ver §1 (overlay demasiado pequeño en VODs viejos).
- `find`/batch del navegador falla a veces → reintentar con captura + coordenadas.
- OBS: nunca "Launch Anyway" (dos instancias → Game Capture negro). Ver `OBS-SCENE-MAP.md`.
