---
status: active
owner: icso
last_review: 2026-08-10
type: runbook
---

# ICSO YouTube — Doppler + camino a facturar

> Objetivo: publicar Bitsitos (y Splashitos) de forma repetible y llegar a **YouTube Partner** en días/semanas de cadencia, no de un click.

Hub: [`ICSO-KIDS-YOUTUBE-HUB.md`](./ICSO-KIDS-YOUTUBE-HUB.md)
Factory: [`docs/runbooks/CONTENT-FACTORY-NOW.md`](../../runbooks/CONTENT-FACTORY-NOW.md)
Config: [`config/content-studio/youtube-channels.json`](../../../config/content-studio/youtube-channels.json)
Queue: [`config/content-studio/youtube-publish-plan.json`](../../../config/content-studio/youtube-publish-plan.json)

## 1. Variables Doppler (`ops-intcloudsysops` / `prd`)

### Metadatos (no secretos — ya se pueden setear)

| Clave | Ejemplo | Uso |
|-------|---------|-----|
| `YOUTUBE_BITSITOS_CHANNEL_ID` | `UCnR41BenV3taCLiYQiOqoGg` | Canal Bitsitos |
| `YOUTUBE_SPLASHITOS_CHANNEL_ID` | _(vacío hasta crear canal)_ | Canal Splashitos |
| `YOUTUBE_UPLOAD_DEFAULT_CHANNEL` | `bitsitos` | Default publish |
| `YOUTUBE_PRIVACY` | `unlisted` | Primero oculto → luego public |
| `YOUTUBE_MADE_FOR_KIDS` | `false` | Padres que enseñan (mejor ads sociales) |
| `YOUTUBE_DEFAULT_CATEGORY_ID` | `27` | Education |
| `YOUTUBE_REDIRECT_URI` | `http://127.0.0.1:8768/oauth2callback` | OAuth local |

### Secretos (OAuth — obligatorios para `--upload`)

| Clave | Origen |
|-------|--------|
| `YOUTUBE_CLIENT_ID` | Google Cloud → OAuth client (proyecto Opsly) |
| `YOUTUBE_CLIENT_SECRET` | mismo client |
| `YOUTUBE_REFRESH_TOKEN` | `./scripts/youtube-oauth-doppler-setup.sh` |

**No** reutilizar el `client_secret` de SmileTripCare / Supabase: otro proyecto y otro redirect.

## 2. Setup OAuth (una vez)

```bash
# Dry-run
./scripts/youtube-oauth-doppler-setup.sh --dry-run

# Tras crear OAuth client en GCP (YouTube Data API v3 + redirect 127.0.0.1:8768):
./scripts/youtube-oauth-doppler-setup.sh \
  --client-json ~/Downloads/youtube-oauth-client.json
```

El script:

1. Escribe metadatos de canal en Doppler.
2. Abre consentimiento Google (scopes upload + readonly).
3. Guarda `YOUTUBE_CLIENT_*` + `YOUTUBE_REFRESH_TOKEN` sin volcar valores.
4. Verifica `channels?mine=true` y alinea `YOUTUBE_BITSITOS_CHANNEL_ID`.

## 3. Publicar

```bash
# Kit local (sin API)
npm run content:bitsitos:publish -- --kit

# Upload API (unlisted)
doppler run --project ops-intcloudsysops --config prd -- \
  npm run content:bitsitos:publish -- --upload

# Upload un solo video, siguiendo el orden editorial de hoy
npm run content:bitsitos:upload:next
```

## 4. Camino a facturar (Partner)

Orden realista:

1. **Canal listo:** nombre Bitsitos, foto, banner, About (ver `channel-about.txt`), links ICSO.
2. **Cadencia:** 1 Short/día (tech → IA → agentes → juegos). Batch 01+02 = 14 listos.
3. **Visibilidad:** unlisted 24–48h de QA → **public**.
4. **Umbral Partner (política vigente):** ~1k suscriptores + 10M Shorts views **o** 4k watch hours / 12 meses.
5. **YouTube Studio → Earn** → aceptar AdSense / Brand Account ICSO.
6. **No** marcar “hecho para niños” en este producto (default Doppler `false`) salvo contenido que hable solo al menor.

### Checklist Studio (humano, 20 min)

- [ ] Brand Account ICSO / IntCloudSysOps Open
- [ ] Bitsitos = canal default de upload
- [ ] Splashitos creado (segundo canal) + ID en JSON + Doppler
- [ ] Feature graphic + avatar
- [ ] About + keywords
- [ ] Enlaces: sitio ICSO (sin Peskids)
- [ ] AdSense vinculado a entidad que pueda facturar

### Automatización segura

Para automatizar sin publicar todo el kit de golpe:

```bash
npm run content:bitsitos:upload:next
```

Eso usa `config/content-studio/youtube-publish-plan.json` como orden editorial y sube solo el siguiente video en cola. Si quieres otro tamaño de lote, usa:

```bash
bash scripts/content-studio-publish-youtube.sh --channel bitsitos --upload --limit 3
```

## 5. Ingreso paralelo

| Línea | Cómo cobra |
|-------|------------|
| Bitsitos | Ads Partner + afiliados educativos (#ad) + talleres ICSO |
| Splashitos | Ads + **pack licencia a Peskids** (Starter / Co-brand) |

Oferta natación: [`YOUTUBE-KIDS-SWIM-CHANNEL.md`](./YOUTUBE-KIDS-SWIM-CHANNEL.md)

## 6. Capacidad

No usar VPS para render/deploy pesado de día (`docs/ops/ACTIVE-CAPACITY-ALERT.md`). Render = Mac / PC gamer.
