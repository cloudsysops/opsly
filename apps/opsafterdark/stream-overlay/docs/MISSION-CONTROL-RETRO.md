# Mission Control — dirección visual "Game Boy retro" (propuesta, #1691)

Maqueta (privada, compartir desde Share): Artifact "Mission Control Stream · Retro" en claude.ai — 2 artboards.

## Paleta y tipografía
- 4 tonos: `#0f380f` (tinta), `#306230`, `#8bac0f`, `#9bbc0f` (fondo). Brillo/acento: rgba(155,188,15,.x).
- Display: Press Start 2P; cuerpo: VT323 (Google Fonts).
- Marcos pixel: borde 4px + box-shadow por capas; animaciones con `steps()` (sin interpolación suave).

## Vista 1 — Stream (solo lectura)
Equipo de agentes (lista con barra CTX y estado) · Pantalla central = VIBE_PIP · rama/PR/sesión tmux ·
cuadro de diálogo con **progreso público** (nunca salida cruda) · Cola BullMQ · Aprobaciones (solo conteo) ·
Salud runtime (CPU/GPU/RAM, :8765, :4001) · Bitácora.

## Vista 2 — Oficina (piel retro de `mission-control/office`)
Mascotas originales (pixel 12×12, sin personajes con copyright): Chispa=Claude, Búho=ChatGPT,
Flechita=Cursor, Bitbot=OpenCode, Dron=Mission Control. Caminan a escritorios (Terminal/tmux, PR, Cola,
Tests, Escenas OBS, Recuperar sesión), "Puerta de aprobación humana", tablero Por hacer/En curso/Espera aprobación.

## Datos (cuando se implemente)
- Fuente: `buildStreamSafeMissionControlProjection` (sin secretos, sin tenant/customer info), loopback.
- Agente activo → `activity.json.active` (vibe-switch lo aplica en VIBE_PIP). `pinned` siempre gana.
- Reusar `office-canvas.tsx` existente; no crear un segundo dashboard.
