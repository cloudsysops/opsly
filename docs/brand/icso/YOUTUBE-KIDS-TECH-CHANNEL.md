---
status: active
owner: icso
last_review: 2026-09-05
type: product-line
---

# ICSO — YouTube: tecnología auténtica para niños (Bitsitos)

Canal **propio de ICSO** para Shorts de tech literacy (niños + padres).  
**No es Peskids.** Sin logo/WhatsApp/dominio Peskids hasta autorización escrita.

Hub operativo: [`ICSO-KIDS-YOUTUBE-HUB.md`](./ICSO-KIDS-YOUTUBE-HUB.md)  
Factory: [`docs/runbooks/CONTENT-FACTORY-NOW.md`](../../runbooks/CONTENT-FACTORY-NOW.md)  
Subida: [`BITSITOS-UPLOAD-NOW.md`](./BITSITOS-UPLOAD-NOW.md)

## Posicionamiento

| Campo | Valor |
|-------|--------|
| Marca | **Bitsitos** |
| Nicho | Tecnología real explicada a niños (y a papás que enseñan) — ES LatAm |
| Formato | YouTube Shorts 9:16 (primario) + long ~2 min (batch-04) |
| Dueño | ICSO — incubado en monorepo Opsly |
| Publicación | Approval-first: kit → unlisted → público |

## Batches

`config/content-studio/channels/bitsitos/`

| Archivo | Pilar |
|---------|--------|
| `batch-01-scripts.json` | Tech / ciberhigiene |
| `batch-02-ai-agents-games.json` | IA, agentes, juegos |
| `batch-03-edu-entretenimiento.json` | Educación + entretenimiento |
| `batch-04-longform-medium.json` | Long ~2 min |

```bash
npm run content:bitsitos:dry-run
npm run content:bitsitos:publish -- --kit
```
