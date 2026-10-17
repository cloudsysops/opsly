---
status: active
owner: operations
last_review: 2026-10-16
type: infrastructure
tags:
  - opsly/infrastructure
  - opsly/streaming
  - opsly/opsafterdark
  - opsly/youtube
---

# OpsAfterDark — Publicación automática de clips (YouTube Shorts)

Conecta la cola de clips de OpsAfterDark (`D:\Content\PostStream\publish-queue.json`, generada por `post-stream-clips`) con el
`YouTubePublisher` que ya existe en `lib/content-studio`. **No sube videos por sí mismo**: reutiliza ese publicador y solo añade cola,
aprobación, tope diario e interruptor. Complementa `docs/runbooks/YOUTUBE-PUBLISHING.md`.

## Estado

- Código probado con adaptadores simulados (55 tests del kit). **Nunca se ha ejecutado contra YouTube real.**
- **Solo YouTube.** TikTok e Instagram quedan como "sin adaptador" (se omiten): no hay credenciales en Doppler y existe un worktree
  `tiktok-publisher` aparte.
- **La tarea programada NO está registrada.** Se registra solo cuando exista el token del canal (ver abajo).

## Por qué un token propio del canal

`YOUTUBE_REFRESH_TOKEN` (ops-intcloudsysops / prd) autoriza el canal **Opsly** (`YOUTUBE_OPSLY_CHANNEL_ID`, `YOUTUBE_UPLOAD_DEFAULT_CHANNEL=opsly`).
Usarlo para clips de gaming publicaría en el canal de la empresa. El puente **nunca** lo usa: exige `YOUTUBE_OPSAFTERDARK_REFRESH_TOKEN`
(token del canal de OpsAfterDark) y, sin él, no sube nada.

## Configuración (la hace un humano; los agentes no editan secretos de Doppler sin confirmación, ver `AGENTS.md`)

1. Autorizar el canal de OpsAfterDark con la cuenta de Google que lo gestiona, scope `https://www.googleapis.com/auth/youtube.upload`
   (mismo `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`; sigue el paso 5 de `YOUTUBE-PUBLISHING.md` con el OAuth Playground o un script local).
2. Guardar en Doppler (`ops-intcloudsysops` / `prd`):
   - `YOUTUBE_OPSAFTERDARK_REFRESH_TOKEN` (obligatorio)
   - `YOUTUBE_OPSAFTERDARK_PRIVACY` = `private` | `unlisted` | `public` (opcional; **por defecto `private`**)
3. Avisos de Google a tener en cuenta:
   - Si la pantalla de consentimiento está en modo **Testing**, los refresh tokens **caducan a los 7 días**. Publícala (Production) para que no caduque.
   - Los videos subidos por proyectos de API **sin verificar** quedan **privados** hasta que Google audite el proyecto.

## Cómo funciona

- `post-stream-clips` deja cada clip vertical en la cola como `draft` (`requiresApproval: true`), 1 por día a las 19:00 ET.
- Un borrador **no se publica** hasta que alguien lo aprueba:
  `powershell -File publisher.ps1 -Approve <id>` o `-Approve all` (`-Status` lista la cola).
- El publicador (`packages/stream-ops-kit/src/publisher.mjs`) toma la entrada aprobada y vencida más antigua, **máximo 1 entrada al día**,
  y llama al adaptador. Cada plataforma se guarda en `platformStatus`; lo ya subido nunca se vuelve a subir. Reintenta hasta 3 veces.
- `--auto-approve` (no usado por el wrapper) aprobaría solos los borradores que pasen chequeos mínimos (vertical existente). Es una decisión
  de política tuya; no está activado.
- **Apagado:** crear `D:\Content\PostStream\PUBLISH_DISABLED` (o `OAD_PUBLISH_DISABLED=1`) detiene toda publicación.
- No corre con OBS en directo ni con OBS abierto sin websocket. Doppler recibe solo 4 secretos (`--only-secrets`).
- Logs: `D:\Content\PostStream\_publisher.log` (los tokens se redactan).

## Probarlo sin subir nada

```powershell
powershell -File apps\opsafterdark\stream-overlay\publisher.ps1 -Dry
```

Con una entrada aprobada y vencida, debe listar qué subiría o qué credenciales faltan, sin llamar a la API.

## Registrar la tarea (cuando exista el token)

```powershell
$a = New-ScheduledTaskAction -Execute powershell.exe -Argument '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "<ruta>\apps\opsafterdark\stream-overlay\publisher.ps1"'
$t = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName OpsAfterDark-Publisher -Action $a -Trigger $t -Settings (New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable) -RunLevel Limited
```

Quitarla: `Unregister-ScheduledTask -TaskName OpsAfterDark-Publisher -Confirm:$false`.

## Pendiente

- Primer upload real (privado) para verificar el flujo y el canal destino.
- Adaptadores de TikTok e Instagram (requieren credenciales; TikTok publica en privado hasta auditar la app).
- Decidir la política de aprobación (manual de un toque vs `--auto-approve`).
