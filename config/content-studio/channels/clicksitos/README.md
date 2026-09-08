# Clicksitos — batch 01

Canal ICSO de **videojuegos**: clicks, aim, ranked y reels 9:16. **No kids. No Peskids.**

Canal vivo: `UCuWcqyL7Vvq3CpMv3EZUQeQ` (Cristian B / `@cristianb550`). Upload cuando el OAuth sea esa Brand Account y haya MP4.

```bash
# Listar guiones
npm run content:clicksitos:dry-run

# Kit local (sin API)
npm run content:clicksitos:publish -- --kit

# Encolar render (PC-gamer only)
doppler run --project ops-intcloudsysops --config prd -- \
  npm run content:clicksitos:enqueue

# Upload (solo cuando el OAuth sea el Brand Account Clicksitos)
npm run content:clicksitos:upload:next
```

Crear canal: [`docs/brand/icso/CLICKSITOS-UPLOAD-NOW.md`](../../../docs/brand/icso/CLICKSITOS-UPLOAD-NOW.md)
