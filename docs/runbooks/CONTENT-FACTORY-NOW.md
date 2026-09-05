---
status: active
owner: icso
last_review: 2026-09-05
type: runbook
---

# Content Factory — arranque completo (Bitsitos + Splashitos)

> **Capacidad VPS:** alerta activa (~4 GiB). No deploy pesado de día. Render = **solo PC-gamer**. Mac encola, sincroniza MP4s y arma el kit. YouTube sigue approval-first.

## Estado objetivo

| Pieza | Quién | Status |
|-------|-------|--------|
| Shorts + long | PC-gamer `content-video` + MoneyPrinter `:8080` | Requiere PC encendido |
| Enqueue / Redis | Mac + Doppler `REDIS_URL` | Job `mpt_base_url=http://127.0.0.1:8080` |
| Kits YouTube | Mac tras `content-studio-sync-renders.sh` | Approval-first |
| Avatar/banner | `runtime/content-studio/brand-assets/` | `--gen-assets` en Mac (ImageMagick) |
| OAuth → Doppler → upload API | Humano + script | No `--upload` sin draft nombrado |
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
# upload solo si el humano nombra el draft
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
| Cursor (Mac) | Enqueue, sync, kits, docs |
| PC-gamer worker | Cola `content-video` + GPU + bridge `:8080` |
| Hermes | Cadencia pilares |
| Humano | OAuth + Studio branding + approve public |

## 5) Cadencia publicar

1 Short/día rotando: Educación → Entretenimiento → Deporte → Tech.  
Orden: [`BITSITOS-UPLOAD-NOW.md`](../brand/icso/BITSITOS-UPLOAD-NOW.md) · [`SPLASHITOS-UPLOAD-NOW.md`](../brand/icso/SPLASHITOS-UPLOAD-NOW.md)

Privacidad inicial: **unlisted** (`YOUTUBE_PRIVACY`).

## 6) No hacer

- Branding Peskids sin autorización
- Render/deploy pesado en VPS de día
- Arrancar MoneyPrinter en Mac como camino normal
- Encolar `content-video` si el gamer está offline (los jobs no tienen consumidor)
- Reusar OAuth SmileTripCare
- `--upload` / `--auto-publish` sin draft nombrado por un humano
