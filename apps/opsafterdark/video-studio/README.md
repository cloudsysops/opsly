# Video Studio — material del canal (OpsAfterDark)

Estudio de video para que los agentes generen clips e intros del canal.
**FFmpeg** corta, convierte y mezcla; **Remotion** (React) pone el diseño neón (mismos colores que los overlays de OBS).

## Instalado (30-sep-2026)
| Herramienta | Versión | Instalación |
|---|---|---|
| FFmpeg / FFprobe (Gyan, full build, con NVENC) | 9.0.2 | `winget install Gyan.FFmpeg` |
| Node.js LTS + npm | 24.19.0 / 11.17.0 | `winget install OpenJS.NodeJS.LTS` |
| Remotion + Chrome Headless Shell (lo baja Remotion solo, 113 MB) | 4.x | `npm install` en esta carpeta |

> En una terminal abierta antes de instalar, `ffmpeg`/`node` pueden no estar en el PATH. Ábrela de nuevo, o en PowerShell:
> `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`

## Carpetas
- `src/` — composiciones: `Intro` (1920×1080, 5 s) y `ClipVertical` (1080×1920 para TikTok/Reels/Shorts).
- `props/` — datos de cada video en JSON (`example-clip.json` es la plantilla).
- `public/` — videos de entrada que usa Remotion (no se sube a git).
- `out/` — resultados (no se sube a git).
- Grabaciones originales: `D:\Content\Media\OBS` (**solo lectura**).

## Recetas para agentes

**1. Cortar un momento de la grabación** (ajusta `-ss` inicio y `-t` duración en segundos; recodifica a 1280×720 para Remotion):
```powershell
ffmpeg -y -ss 3600 -t 45 -i "D:\Content\Media\OBS\ARCHIVO.mp4" -vf "scale=1280:720" -c:v libx264 -crf 23 -preset veryfast -c:a aac -b:a 160k public\clip1.mp4
```

**2. Clip vertical con el diseño del canal.** Copia `props/example-clip.json` a `props/clip1.json`, ponle `"video": "clip1.mp4"`, tu título y hashtags, y:
```powershell
npx remotion render ClipVertical out/clip1.mp4 --props=props/clip1.json --frames=0-1349
```
`--frames=0-N` = duración; 30 fotogramas = 1 s (1349 → 45 s). Vista previa de un fotograma: `npx remotion still ClipVertical out/prev.png --frame=60 --props=props/clip1.json`.
Usa siempre `--props=<archivo.json>` (en PowerShell las comillas de JSON en línea fallan).

**3. Intro:** `npm run render:intro` → `out/intro.mp4`. Texto propio: `--props=props/intro.json` con `{"title":"...","subtitle":"..."}`.

**4. Diseño en vivo:** `npm run studio` abre el editor visual de Remotion en el navegador.

**5. Utilidades de FFmpeg**
- Normalizar volumen: `ffmpeg -i in.mp4 -af loudnorm=I=-16:TP=-1.5 -c:v copy out.mp4`
- Elegir pista de audio (p. ej. solo la 2 = VOD): `ffmpeg -i in.mp4 -map 0:v -map 0:a:1 -c copy out.mp4`
- Miniatura: `ffmpeg -ss 12 -i in.mp4 -frames:v 1 miniatura.png`
- Inspeccionar: `ffprobe -v error -show_entries stream=codec_name,width,height,duration -of compact archivo.mp4`

## Reglas para los agentes
1. **No publicar nada.** Este estudio solo genera archivos en `out/`. Subir a Twitch, TikTok, YouTube o Instagram lo aprueba y lo hace la persona.
2. **Revisar antes de entregar:** las grabaciones capturan la pantalla y pueden mostrar pestañas, mensajes, claves o datos personales. Mira los fotogramas del clip antes de darlo por bueno.
3. **Música:** usa solo los patrones de `stream-overlay/music/` (ver `LICENCIAS.md`) o audio con licencia documentada. Las grabaciones llevan la pista 1 (mezcla con música) y la pista 2 (VOD, sin música); para material publicable, prefiere la pista 2 y añade música propia.
4. **No borrar ni modificar** los originales de `D:\Content\Media\OBS`; escribe siempre en `public/` u `out/`.
5. **Los momentos los elige la persona** (minuto exacto): los agentes no ven el video, solo lo procesan.
