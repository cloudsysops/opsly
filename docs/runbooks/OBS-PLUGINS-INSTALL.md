---
status: active
owner: operations
last_review: 2026-10-05
type: runbook
tags:
  - opsly/worker
  - opsly/gaming
---

# OBS: plugins de lienzo vertical y multistream

Instala en el PC de streaming (Windows) los plugins de OBS usados para emitir en
horizontal y vertical a la vez. Complementa [[STREAMING-GAMER-DJ-NDI]].

## Plugins

| Plugin | Repo | Uso |
|---|---|---|
| Aitum Vertical | `Aitum/obs-vertical-canvas` | Segundo lienzo 9:16 (Shorts, TikTok, Reels) |
| obs-multi-rtmp (por defecto) | `sorayuki/obs-multi-rtmp` | Emitir a Twitch, Kick y YouTube a la vez |
| Aitum Multistream (alternativa) | `Aitum/obs-aitum-multistream` | Igual que el anterior, con panel de Aitum |

Instalar un solo plugin de multistream, no ambos.

## Uso

Con OBS cerrado, en PowerShell:

```powershell
.\scripts\ops\install-obs-plugins.ps1 -DryRun            # solo lista qué descargaría
.\scripts\ops\install-obs-plugins.ps1                    # Aitum Vertical + obs-multi-rtmp
.\scripts\ops\install-obs-plugins.ps1 -Multistream aitum # usa Aitum Multistream
.\scripts\ops\install-obs-plugins.ps1 -Multistream none  # solo el lienzo vertical
```

El script consulta el último release de cada repo, elige el asset de Windows (`.exe`
primero, `.zip` si no hay), imprime el SHA256 de la descarga y ejecuta el instalador.
Se niega a correr si `obs64` está abierto.

## Limitaciones

- Los nombres de assets de cada release no se verificaron; si ninguno coincide, el script
  falla e imprime los disponibles.
- Con un `.zip` solo extrae: hay que copiar `obs-plugins` y `data` a
  `C:\Program Files\obs-studio` a mano.
- Probar primero con `-DryRun` en el PC de streaming.

## Verificación

OBS > Docks: deben aparecer los paneles de lienzo vertical y de multistream.
