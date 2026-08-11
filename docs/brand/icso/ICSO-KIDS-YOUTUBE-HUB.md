---
status: active
owner: icso
last_review: 2026-08-10
type: product-line
---

# ICSO — Canales kids YouTube (ingreso + oferta)

Dos marcas **propias ICSO** (no Peskids hasta contrato):

| Canal | Nicho | Para qué |
|-------|--------|----------|
| **Splashitos** | Natación + deporte kids | Ingreso YouTube + **ofrecer pack a Peskids** |
| **Bitsitos** | Tech/IA + educación + entretenimiento | **Ingreso YouTube** / canal kids |

## Bitsitos — pilares de contenido

| Pilar | % semanal | Ejemplos |
|-------|-----------|----------|
| Tech / IA | 25% | WiFi, prompts, agentes (batch 01–02) |
| Educación | 25% | pregunta, mapa mental, error útil (batch 03) |
| Entretenimiento | 25% | show 3 actos, cuento, humor limpio (batch 03) |
| Juegos / historias | 25% | boss, NPC, loop (batch 02) |

## Splashitos — deporte

| Pilar | Ejemplos |
|-------|----------|
| Natación | flotar, patada, respirar (batch 01) |
| Deporte kids | calentar, equilibrio, fair play, plank, hidratación (batch 02) |

Cadencia objetivo: **1 Short/día** (Lun–Vie Bitsitos o Splashitos según calendario; Sáb mito; Dom reply).

## Arranque operativo (factory)

Runbook: [`docs/runbooks/CONTENT-FACTORY-NOW.md`](../../runbooks/CONTENT-FACTORY-NOW.md)  
OAuth GCP: [`OPSLYQUANTUM-YOUTUBE-SETUP.md`](./OPSLYQUANTUM-YOUTUBE-SETUP.md)  
Agentes: `config/content-studio/content-agents.json`

```bash
npm run content:factory:mac          # bridge + brand assets + kits
npm run content:factory:oauth-watch  # espera youtube-oauth-client.json
npm run content:factory:gamer        # cuando PC gamer esté online
```

## Cómo ganar plata

1. Publicar unlisted → revisar → público.
2. Empujar a umbral Partner (ads).
3. Splashitos → fee a Peskids (Starter/Co-brand).
4. Bitsitos → afiliados educativos / talleres ICSO (con #ad).

## Kits listos en disco

```
runtime/content-studio/youtube-upload-kit/splashitos/
runtime/content-studio/youtube-upload-kit/bitsitos/
```

Guías: [`SPLASHITOS-UPLOAD-NOW.md`](./SPLASHITOS-UPLOAD-NOW.md) · [`BITSITOS-UPLOAD-NOW.md`](./BITSITOS-UPLOAD-NOW.md) · [`OPSLY-UNIVERSE-BIBLE.md`](./OPSLY-UNIVERSE-BIBLE.md)

Saga config:

- [`config/content-studio/saga/README.md`](/Users/dragon/cboteros/proyectos/intcloudsysops/config/content-studio/saga/README.md)
- [`ideas.json`](/Users/dragon/cboteros/proyectos/intcloudsysops/config/content-studio/saga/ideas.json)
- [`characters.json`](/Users/dragon/cboteros/proyectos/intcloudsysops/config/content-studio/saga/characters.json)
- [`worlds.json`](/Users/dragon/cboteros/proyectos/intcloudsysops/config/content-studio/saga/worlds.json)
- [`symbols.json`](/Users/dragon/cboteros/proyectos/intcloudsysops/config/content-studio/saga/symbols.json)
- [`episode-templates.json`](/Users/dragon/cboteros/proyectos/intcloudsysops/config/content-studio/saga/episode-templates.json)
- [`campaigns.json`](/Users/dragon/cboteros/proyectos/intcloudsysops/config/content-studio/saga/campaigns.json)

## Comandos

```bash
# Natación
npm run content:splashitos:dry-run
npm run content:splashitos:publish -- --kit

# Tech / IA / agentes / juegos
npm run content:bitsitos:dry-run
./scripts/content-studio-enqueue.sh --channel bitsitos --batch config/content-studio/channels/bitsitos/batch-02-ai-agents-games.json --dry-run
# render local: ver scripts o bridge :8080
npm run content:bitsitos:publish -- --kit
```

Producción: Mac + PC gamer (`docs/04-infrastructure/PC-GAMER-WORKER.md`).

## Pilares de contenido (Shorts + Long)

| Pilar | Canal | Qué hay |
|-------|--------|---------|
| Educación | Bitsitos | batch-03 + longform outline |
| Entretenimiento | Bitsitos | batch-03 shows/cuentos + juegos batch-02 |
| Deporte | Splashitos | batch-02 deporte + natación batch-01 |
| Tech / IA | Bitsitos | batch-01 + batch-02 |

Long-form (8 min outlines): `config/content-studio/channels/bitsitos/longform-04-outlines.json`

## Doppler + facturar

Runbook: [`YOUTUBE-DOPPLER-MONETIZATION.md`](./YOUTUBE-DOPPLER-MONETIZATION.md)

```bash
npm run youtube:doppler:check
npm run youtube:oauth:dry
# Tras OAuth client GCP:
# ./scripts/youtube-oauth-doppler-setup.sh --client-json ~/Downloads/youtube-oauth-client.json
npm run content:bitsitos:upload   # unlisted vía API
```
