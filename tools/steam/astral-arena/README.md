# Astral Arena SteamPipe

This directory contains **templates only**. Real Steam AppID, DepotID and credentials are
never committed.

## Prepare a private SteamPipe package

First build the Windows artifact into `dist/astral-arena`, then:

```bash
STEAM_APP_ID=123456 \
STEAM_DEPOT_WINDOWS_ID=123457 \
STEAM_BUILD_DESC="private playtest $(git rev-parse --short HEAD)" \
node scripts/games/render-astral-steampipe.mjs
```

Generated files live under:

`dist/steam/astral-arena/`

The generator fails closed when:
- IDs are missing or non-numeric;
- the Windows build does not contain `AstralArena.exe`;
- a template token remains unresolved.

## Upload boundary

No Steam credentials are stored here and this template does **not** auto-upload.

When Steamworks onboarding is complete, add a dedicated, least-privilege Steam build
account and a protected GitHub environment such as `steam-release`. The upload job
must require human approval and must never run on pull requests.

Recommended promotion flow:

`Windows artifact → SteamPipe prepare → private branch/playtest → human QA → promote`
