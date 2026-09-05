---
status: active
owner: icso
last_review: 2026-09-05
type: runbook
---

# Content Factory — arranque completo (Bitsitos + Splashitos)

> **Capacidad VPS:** alerta activa (~4 GiB). No deploy pesado de día. Render = **solo PC-gamer**. Mac encola, sincroniza MP4s y **publica 24×7** el siguiente unpublished (unlisted, tope 6/día por cuota YouTube).

## Estado objetivo

| Pieza | Quién | Status |
|-------|-------|--------|
| Shorts + long | PC-gamer `content-video` + MoneyPrinter `:8080` | Requiere PC encendido |
| Enqueue / Redis | Mac + Doppler `REDIS_URL` | Job `mpt_base_url=http://127.0.0.1:8080` |
| Kits YouTube | Mac tras `content-studio-sync-renders.sh` | Ledger `runtime/content-studio/published.json` |
| Avatar/banner | `runtime/content-studio/brand-assets/` | `--gen-assets` en Mac (ImageMagick) |
| OAuth → Doppler → upload API | LaunchAgent 24×7 cada 15 min | Siguiente unpublished `--limit 1` |
| Agentes | `config/content-studio/content-agents.json` | Roster gamer-only |

## 1) PC-gamer (obligatorio para render)

```bash
./scripts/ops/check-pc-gamer-online.sh --json
npm run content:factory              # = --gamer-up
# o:
./scripts/ops/pc-gamer-reconnect.sh --use-host-ollama --with-content
```

En WSL si falla SSH:

```bash
cd ~/opsly
git fetch origin && git checkout feat/content-studio-youtube && git pull --ff-only
cp infra/pc-gamer.env.example .env.worker   # + REDIS_URL real
./scripts/ops/pc-gamer-docker-plane.sh --up --use-host-ollama --with-content
```

Allowlist: `OPSLY_WORKER_ALLOWLIST=ollama,content-video`  
MoneyPrinter en el gamer: `MONEY_PRINTER_TURBO_URL=http://127.0.0.1:8080`

Enqueue desde Mac (Doppler; **no** apuntes el job al IP Tailscale):

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  npm run content:bitsitos:gamer
```

Tras los jobs:

```bash
./scripts/ops/content-studio-sync-renders.sh
npm run content:bitsitos:publish -- --kit
```

## 2) Cuenta YouTube / opslyquantum

Checklist: [`OPSLYQUANTUM-YOUTUBE-SETUP.md`](../brand/icso/OPSLYQUANTUM-YOUTUBE-SETUP.md)

```bash
./scripts/content-factory-bootstrap.sh --watch-oauth
# cuando exista ~/Downloads/youtube-oauth-client.json → Doppler + refresh token
# 24×7: el Mac sube el siguiente unpublished (unlisted)
npm run content:24x7:dry
./scripts/ops/ensure-content-studio-24x7-launchd.sh
```

## 3) Kits / brand en Mac (sin render)

```bash
./scripts/content-factory-bootstrap.sh --gen-assets --rebuild-kits
```

Kits:

- `runtime/content-studio/youtube-upload-kit/bitsitos/`
- `runtime/content-studio/youtube-upload-kit/splashitos/`

`--mac-bridge` existe solo como emergencia y avisa. No es el default.

## 4) Agentes a trabajar

Roster: `config/content-studio/content-agents.json`

| Agente | Trabajo |
|--------|---------|
| Cursor (Mac) | Enqueue, sync, kits, tick 24×7 |
| PC-gamer worker | Cola `content-video` + GPU + bridge `:8080` |
| Hermes | Cadencia pilares |
| Launchd | `com.opsly.content-studio-24x7` cada 15 min |
| Humano | OAuth en Doppler + branding Splashitos channel id |

## 5) Cadencia publicar (24×7)

Fábrica siempre encendida en el Mac. **No** 24 uploads/día: la API de YouTube da ~6 videos/día (1600 unidades × 6 ≈ cuota 10k).

| Pieza | Regla |
|-------|--------|
| Tick | `scripts/ops/content-studio-24x7.sh` cada 15 min |
| Upload | 1 unpublished por tick, si pasaron 4 h y hay cupo |
| Tope | `CONTENT_STUDIO_UPLOADS_PER_DAY=6` |
| Privacidad | `YOUTUBE_PRIVACY` (Doppler, default **unlisted**) |
| Render | Solo gamer en `heavy`/`light`; durante `gaming` solo publica |
| Splashitos | Skip upload hasta `YOUTUBE_SPLASHITOS_CHANNEL_ID` |
| Skip | `runtime/content-studio/published.json` + `upload-results.json` |

Orden: [`BITSITOS-UPLOAD-NOW.md`](../brand/icso/BITSITOS-UPLOAD-NOW.md) · [`SPLASHITOS-UPLOAD-NOW.md`](../brand/icso/SPLASHITOS-UPLOAD-NOW.md)

## 6) No hacer

- Branding Peskids sin autorización
- Render/deploy pesado en VPS de día
- Arrancar MoneyPrinter en Mac como camino normal
- Encolar `content-video` si el gamer está offline (los jobs no tienen consumidor)
- Reusar OAuth SmileTripCare
- `--upload` sin `--limit` (re-subiría el lote; el ledger ya salta publicados)
- `YOUTUBE_MADE_FOR_KIDS=true` sin revisión humana
