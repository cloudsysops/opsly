# Splashitos — batch 01

Canal ICSO de tips virales de natación para niños. **No Peskids.**

Ver estrategia: [`docs/brand/icso/YOUTUBE-KIDS-SWIM-CHANNEL.md`](../../../docs/brand/icso/YOUTUBE-KIDS-SWIM-CHANNEL.md)

```bash
# Listar guiones
npm run content:splashitos:dry-run

# Encolar render (PC-gamer only; job usa localhost:8080 en el worker)
doppler run --project ops-intcloudsysops --config prd -- \
  npm run content:splashitos:enqueue
```
