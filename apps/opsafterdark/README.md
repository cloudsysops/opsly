# OpsAfterDark — primer tenant del vertical `gaming-streamer`

Canal de streaming (vibe coding + Battlefield 6). Primer tenant de lo que será
un vertical repetible para creadores de contenido gamer, siguiendo el mismo
patrón que el resto de tenants de Opsly (`docs/blueprints/TENANT-REPEAT-PLAYBOOK.md`).

- **Launch contract:** `clients/opsafterdark.launch.json`
- **Vertical blueprint:** `config/vertical-blueprints/gaming-streamer.json`

## Contenido

- `stream-overlay/` — servidor de overlays y automatización de OBS (escenas,
  alertas, cuenta regresiva, panel de rendimiento). Ver su propio
  `stream-overlay/README.md` para el flujo completo.
- `video-studio/` — proyecto Remotion para clips/intro del canal.

## Estado

Draft (`extraction_ready: false`). Pendiente antes de bootstrap real:
confirmar email/dominio de contacto y revisar el flujo de CRM/Doppler descrito
en el launch contract.
