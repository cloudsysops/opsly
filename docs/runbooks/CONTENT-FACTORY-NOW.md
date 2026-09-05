---
status: active
owner: icso
last_review: 2026-09-05
type: runbook
---

# Content Factory — arranque completo (Bitsitos + Splashitos)

> **Capacidad VPS:** alerta activa (~4 GiB). No deploy pesado de día. Render = **Mac** o **PC gamer**.

## Estado objetivo

| Pieza | Quién | Status |
|-------|-------|--------|
| Shorts edu/ent/tech | Mac bridge | Kits listos |
| Shorts deporte | Mac bridge | Kits listos |
| Long ~2.5 min | Mac bridge | batch-04 |
| Imágenes/escenas | bridge gradients + brand bar | Mejorado |
| Avatar/banner | `runtime/content-studio/brand-assets/` | Generar con bootstrap |
| PC gamer content-video | WSL Docker `--with-content` | Offline hasta encender |
| OAuth → Doppler → upload API | Humano + script | Bloqueado hasta `json listo` |
| Agentes | `config/content-studio/content-agents.json` | Roster |

## 1) Mac ahora (sin gamer)

```bash
chmod +x scripts/content-factory-bootstrap.sh
./scripts/content-factory-bootstrap.sh --mac-bridge --gen-assets --rebuild-kits
```

Kits:

- `runtime/content-studio/youtube-upload-kit/bitsitos/`
- `runtime/content-studio/youtube-upload-kit/splashitos/`
- Brand: `runtime/content-studio/brand-assets/*avatar.png` + `*banner.png`

Publicar (hasta OAuth): arrastra MP4 a Studio + sube avatar/banner en personalización del canal.

## 2) Cuenta YouTube / opslyquantum

Checklist: [`OPSLYQUANTUM-YOUTUBE-SETUP.md`](../brand/icso/OPSLYQUANTUM-YOUTUBE-SETUP.md)

```bash
./scripts/content-factory-bootstrap.sh --watch-oauth
# cuando exista ~/Downloads/youtube-oauth-client.json → Doppler + refresh token
npm run content:bitsitos:upload
```

## 3) PC gamer (cuando esté online)

```bash
./scripts/ops/check-pc-gamer-online.sh --json
./scripts/content-factory-bootstrap.sh --gamer-up
# en WSL si falla SSH:
cd ~/opsly && git pull --ff-only
cp infra/pc-gamer.env.example .env.worker   # + REDIS_URL real
./scripts/ops/pc-gamer-docker-plane.sh --up --with-content
```

Allowlist: `OPSLY_WORKER_ALLOWLIST=ollama,content-video`  
Enqueue desde Mac (con REDIS_URL):

```bash
MONEY_PRINTER_TURBO_URL=http://100.74.88.103:8080 \
  ./scripts/content-studio-enqueue.sh --channel bitsitos
```

## 4) Agentes a trabajar

Roster: `config/content-studio/content-agents.json`

| Agente | Trabajo |
|--------|---------|
| Cursor (Mac) | Bridge, render, kits, docs |
| PC-gamer worker | Cola `content-video` + GPU |
| Hermes | Cadencia pilares |
| Humano | OAuth + Studio branding + approve public |

## 5) Cadencia publicar

1 Short/día rotando: Educación → Entretenimiento → Deporte → Tech.  
Orden: [`BITSITOS-UPLOAD-NOW.md`](../brand/icso/BITSITOS-UPLOAD-NOW.md) · [`SPLASHITOS-UPLOAD-NOW.md`](../brand/icso/SPLASHITOS-UPLOAD-NOW.md)

Privacidad inicial: **unlisted** (`YOUTUBE_PRIVACY`).

## 6) No hacer

- Branding Peskids sin autorización
- Render/deploy pesado en VPS de día
- Reusar OAuth SmileTripCare
