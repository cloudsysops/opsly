---
status: active
owner: icso
last_review: 2026-09-05
type: runbook
---

# Clicksitos — canal gamer (clicks / reels)

Canal ICSO de **videojuegos** (Shorts 9:16). **No kids. No Peskids.**

Canal vivo: [`UCuWcqyL7Vvq3CpMv3EZUQeQ`](https://studio.youtube.com/channel/UCuWcqyL7Vvq3CpMv3EZUQeQ) — público **Cristian B** (`@cristianb550`). El token Doppler sigue en `@opsly`; hay que rehacer OAuth eligiendo **esta** Brand Account. En Studio puedes renombrar a Clicksitos.

Bitsitos **no** usa este canal.

## Publicar

```bash
npm run content:clicksitos:dry-run
npm run content:clicksitos:publish -- --kit

doppler run --project ops-intcloudsysops --config prd -- \
  npm run content:clicksitos:enqueue

npm run content:clicksitos:upload:next
```

Privacidad default: `YOUTUBE_PRIVACY` (unlisted). Categoría YouTube **20** (Gaming).

Kit: `runtime/content-studio/youtube-upload-kit/clicksitos/`
