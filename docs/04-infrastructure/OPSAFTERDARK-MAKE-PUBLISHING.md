---
status: active
owner: operations
last_review: 2026-10-17
type: infrastructure
tags:
  - opsly/infrastructure
  - opsly/streaming
  - opsly/opsafterdark
  - opsly/make
---

# OpsAfterDark — publicación social vía Make.com

El publicador PostStream ya puede entregar clips a **TikTok** e **Instagram Reels**
disparando el webhook Make `opsly-opsafterdark-ingress`
(`MAKE_OPSAFTERDARK_WEBHOOK_URL` en Doppler `ops-intcloudsysops/prd`).

YouTube Shorts sigue yendo por el adaptador nativo (`YOUTUBE_OPSAFTERDARK_*`).
Las cuentas “conectadas” en **Twitch no se usan** aquí: Make necesita sus propias
conexiones Instagram / TikTok en la UI de Make.

## Qué hay configurado en código / Doppler

| Pieza | Estado |
|-------|--------|
| Hook Make `opsly-opsafterdark-ingress` | Creado (team Make actual) |
| `MAKE_OPSAFTERDARK_WEBHOOK_URL` | En Doppler `prd` |
| Adaptadores `tiktok` + `instagram_reels` | `packages/stream-ops-kit/src/make-bridge.mjs` |
| Aprobación humana | Obligatoria (`draft` → `-Approve`) |

## Escenario Make (humano, ~15 min)

1. En [Make](https://us2.make.com) → crea un escenario nuevo, p. ej. `OpsAfterDark PostStream`.
2. Trigger: **Webhooks → Custom webhook** → elige el hook existente
   `opsly-opsafterdark-ingress` (o pega la URL de Doppler sin pegarla en chat/git).
3. Determina la plataforma con un **Router** / **Filter** sobre `platform`
   (`tiktok` | `instagram_reels`).
4. Conecta módulos:
   - **TikTok** → Upload video (cuenta OpsAfterDark).
   - **Instagram for Business** → Create a Reel (cuenta/página vinculada).
5. El payload JSON incluye `caption`, `entry_id`, `vertical.path` / `vertical.path_posix`,
   `vertical.bytes`. **Make cloud no puede leer `D:\…`.**
   Opciones para el archivo:
   - **A (recomendada):** sube el vertical a Drive/CDN y añade en el escenario un
     paso que use esa URL pública (siguiente incremento: staging automático).
   - **B:** módulo manual / revisión humana del fichero en la carpeta
     `D:\Content\PostStream\…` hasta tener staging.
6. Activa el escenario. Prueba con `publisher.ps1 -Dry` y luego una entrada
   aprobada + vencida.

## Flujo operativo

```
Live → post-stream-clips → draft en publish-queue.json
     → humano: publisher.ps1 -Approve <id>
     → a la hora: OpsAfterDark-Publisher
         → youtube_shorts (API YouTube)
         → tiktok / instagram_reels (POST Make webhook)
```

## Seguridad

- Sin `-Approve`, no se dispara Make.
- `PUBLISH_DISABLED` en `D:\Content\PostStream\` apaga todo.
- No reutilices el token YouTube de Opsly; Make usa sus OAuth propios.
- No pegues `MAKE_OPSAFTERDARK_WEBHOOK_URL` en el repo ni en Discord.

## Pendiente

- Staging automático del `.mp4` a URL firmada (Drive/R2) para que Make suba sin paso manual.
- Conectar cuentas TikTok + Instagram Business en Make (solo tú en la UI).
