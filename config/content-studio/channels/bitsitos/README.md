# Bitsitos — batch 01

Canal ICSO primario: **tecnología auténtica para niños y familias**. No Peskids.

Doc: [`docs/brand/icso/YOUTUBE-KIDS-TECH-CHANNEL.md`](../../../../docs/brand/icso/YOUTUBE-KIDS-TECH-CHANNEL.md)

```bash
# Listar 7 guiones virales
npm run content:bitsitos:dry-run

# PC-gamer only (job → localhost:8080 en el worker)
doppler run --project ops-intcloudsysops --config prd -- \
  npm run content:bitsitos:gamer
./scripts/ops/content-studio-sync-renders.sh

# Kit / upload YouTube (default unlisted)
npm run content:bitsitos:publish -- --dry-run
npm run content:bitsitos:publish -- --kit
# doppler run … npm run content:bitsitos:publish -- --upload
```
