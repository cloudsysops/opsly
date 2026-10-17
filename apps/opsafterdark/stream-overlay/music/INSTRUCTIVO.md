# Música en vivo con Strudel — instructivo corto

Patrones: `01-techno-oscuro`, `02-house-suave`, `03-build-up`, `04-drop` (en esta carpeta, extensión `.strudel`).
Licencias y avisos de copyright: [LICENCIAS.md](LICENCIAS.md).

## Antes de salir (una sola vez)

1. Con OBS abierto y **sin transmitir**:
   ```powershell
   cd C:\Users\opsly\OneDrive\Documents\ChatGPT\intcloudsysops\stream-overlay
   powershell -ExecutionPolicy Bypass -File .\run.ps1 music-setup
   ```
   Crea la fuente **"Strudel Música"** (un navegador con `https://strudel.cc/` cuyo audio se redirige a OBS). Queda fuera del lienzo en las 7 escenas, así no se ve y el audio no se corta al cambiar de escena. Va **solo a la pista 1**, a −18 dB y con el monitoreo apagado. No modifica Desktop Audio, Mic/Aux ni ningún ajuste global.
2. Comprueba que los patrones siguen usando solo sonidos permitidos:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\run.ps1 music-check
   ```
3. Necesita internet: la fuente carga strudel.cc.

## Durante el directo

### Abrir Strudel y cargar un patrón
1. Copia el patrón y actualiza el widget "Sonando ahora":
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\run.ps1 music techno
   ```
   (también `house`, `buildup`, `drop`). Copia el código al portapapeles y escribe el nombre en el widget.
2. En OBS, en **Fuentes**, clic derecho en **Strudel Música → Interactuar**. Se abre una ventana con el editor de Strudel.
3. Clic dentro del editor → `Ctrl+A` → `Ctrl+V` → **`Ctrl+Enter`**. La música empieza (`Ctrl+.` la para).
4. Mira el mezclador de OBS: debe moverse la barra de **Strudel Música**. Ajusta su volumen para que se oiga bien tu voz (−18 dB es un punto de partida).

### Cambiar entre patrones
- `run.ps1 music house` → en la ventana Interactuar: `Ctrl+A`, `Ctrl+V`, `Ctrl+Enter`. El patrón nuevo entra en el siguiente ciclo, sin cortar.
- **Build-up → drop:** empieza `buildup` unos 8 compases antes del momento que quieras (a 130 BPM ≈ 15 s). Cuando suene el riser al máximo, carga `drop`.
- Para probar tu propio patrón: `run.ps1 music "Mi mezcla" "improvisando"` pone ese texto en el widget. `run.ps1 music off` lo oculta.

### Editar en vivo
Cada archivo lleva comentarios en español con qué cambiar. Lo más útil: los BPM en `setcps(130/60/4)`, el número de `.lpf(...)` (más bajo = más apagado), y poner/quitar `_` delante de `$:` para silenciar o activar una capa. Aplica siempre con `Ctrl+Enter`.

### Actualizar el widget sin usar el comando
Edita `music/nowplaying.txt`: línea 1 = título, línea 2 = detalle (opcional). Vacío = widget oculto. El overlay lo lee cada 2 s.

## Pista separada: excluir la música del VOD de Twitch

Tu OBS ya está en modo Avanzado con:
- **Pista 1 "Mezcla"** = lo que ve el público en directo.
- **Pista 2 "Juego-PC"** = pista de VOD de Twitch (opción "Pista de VOD de Twitch" activa).

Como **Strudel Música solo está en la pista 1 y no en la 2**, el directo la lleva y el VOD no. Para que se cumpla:

1. **Escucha la música sin que entre a "Desktop Audio".** OBS monitorea por el dispositivo `Default`, que es el que captura Desktop Audio; si activas el monitoreo así, la música se cuela en la pista 2. Solución: en *Ajustes → Audio → Avanzado → Dispositivo de monitoreo* elige un dispositivo **distinto** (p. ej. tus auriculares USB) del que captura Desktop Audio. Luego, en *Propiedades avanzadas de audio*, pon **Strudel Música → Monitorear y emitir**. Esto último **no lo hice yo** porque toca ajustes globales.
2. **No abras strudel.cc en Chrome/Edge mientras transmites.** Sonaría por el altavoz del sistema y entraría por Desktop Audio (pistas 1 **y 2**).
3. **Prueba antes:** haz un directo corto de 2–3 minutos con música y revisa el VOD. No pude verificarlo sin salir en vivo, y tu cuenta usa *Enhanced Broadcasting*, así que confirma con el VOD real que la música no aparece.
4. Ojo: los **clips** de Twitch se cortan del directo (pista 1), así que **sí llevarán la música**. Los destacados hechos desde el VOD, no.

### Pistas confirmadas (30-sep-2026)

| Fuente | Pistas | Nota |
|---|---|---|
| Mic/Aux | 1, **2**, 3 | La 3 ("Micro") se mantiene: es una pista de voz aparte para grabar. La 2 se **añadió** porque el VOD no llevaba voz. |
| Desktop Audio | 1, 2 | Juego. Sin cambios. |
| Strudel Música | **solo 1** | Nunca en la 2. |

`run.ps1 vod-audio-fix` vuelve a dejar exactamente estas pistas si alguien las cambia; `preflight` las revisa.

### Qué dispositivo de monitoreo es seguro (auriculares USB)

- Tu **Desktop Audio está fijado a "Headphones (HyperX Cloud Jet)"** (no a Default). OBS lo captura por *loopback*: recoge **todo** lo que suena por ese dispositivo, incluido lo que OBS mande al monitoreo. Por eso **no pongas el HyperX como dispositivo de monitoreo**: la música entraría a las pistas 1 y 2.
- **Seguro:** unos auriculares USB **distintos** al HyperX, elegidos **por su nombre** en *Ajustes → Audio → Avanzado → Dispositivo de monitoreo* (nunca "Default"). Desktop Audio sigue fijo al HyperX, así que no los captura.
- Que el juego siga saliendo por el HyperX (comprueba que Windows no cambie la salida predeterminada ni el mezclador de volumen del juego a los auriculares nuevos), o el VOD perdería el juego.
- Después de configurarlo, pon **Strudel Música → Monitorear y emitir** y repite la prueba: `run.ps1 test-vod-audio`.

### Prueba local sin transmitir

`run.ps1 test-vod-audio` graba ~140 s en `D:\Content\Media\OBS` (fases: sin música / Strudel / fin) con las mismas 4 pistas del directo, y restaura la escena "inicio" y la fuente de Strudel. Para revisar el archivo: `node extract-audio-tracks.mjs "<archivo.mp4>"` y abre `http://127.0.0.1:8765/analyze`. **Habla durante toda la prueba** para poder confirmar la voz.
