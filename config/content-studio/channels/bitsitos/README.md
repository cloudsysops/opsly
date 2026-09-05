# Bitsitos — batch 01

Canal ICSO primario: **tecnología auténtica para niños y familias**. No Peskids.

Doc: [`docs/brand/icso/YOUTUBE-KIDS-TECH-CHANNEL.md`](../../../../docs/brand/icso/YOUTUBE-KIDS-TECH-CHANNEL.md)

```bash
# Listar 7 guiones virales
npm run content:bitsitos:dry-run

# Mac + PC gamer (render)
MONEY_PRINTER_TURBO_URL=http://100.74.88.103:8080 \
  REDIS_URL=… npm run content:bitsitos:gamer

# Kit / upload YouTube (default unlisted)
npm run content:bitsitos:publish -- --dry-run
npm run content:bitsitos:publish -- --kit
# doppler run … npm run content:bitsitos:publish -- --upload
```
