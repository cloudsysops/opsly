# Splashitos — batch 01

Canal ICSO de tips virales de natación para niños. **No Peskids.**

Ver estrategia: [`docs/brand/icso/YOUTUBE-KIDS-SWIM-CHANNEL.md`](../../../docs/brand/icso/YOUTUBE-KIDS-SWIM-CHANNEL.md)

```bash
# Listar guiones
./scripts/content-splashitos-enqueue.sh --dry-run

# Encolar render (PC gamer / worker content-video + MoneyPrinter)
REDIS_URL=… MONEY_PRINTER_TURBO_URL=… ./scripts/content-splashitos-enqueue.sh
```
