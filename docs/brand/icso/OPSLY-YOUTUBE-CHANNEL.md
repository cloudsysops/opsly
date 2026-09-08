---
status: active
owner: icso
last_review: 2026-09-05
type: runbook
---

# Opsly — canal YouTube empresa

Canal vivo: [`UCuC5_xc2M3muQzuPR2rrhwA`](https://studio.youtube.com/channel/UCuC5_xc2M3muQzuPR2rrhwA) (`@opsly`).

El refresh token de Doppler **ya pertenece a este canal**. Es el único al que la fábrica puede subir hoy.

| No publicar aquí | Por qué |
|---|---|
| Bitsitos | Otro ID / kids-edu |
| Clicksitos | Otro Brand Account (`@cristianb550`) |
| Opsly Universe | Sigue con `approval_required` |
| Peskids | No es marca de este canal |

## Apariencia

Banner + About se aplican por API (OAuth `@opsly`):

```bash
npm run content:opsly:brand:dry
npm run content:opsly:brand
```

YouTube **no** deja cambiar el avatar por Data API. Si la foto sigue genérica, Studio → Personalización:

| Campo | Archivo |
|---|---|
| Foto de perfil (800×800) | `docs/brand/icso/youtube/opsly-avatar.png` |
| Banner (2560×1440) | `docs/brand/icso/youtube/opsly-banner.png` |
| Nombre | **Opsly** |
| About | `config/content-studio/channels/opsly/channel-about.txt` |
| Audiencia | no kids |

No uses los tableros de `docs/brand/icso/universe/` como avatar de `@opsly`. Esos boards son canon de **historias** (Universe / Bitsitos / Splashitos), no de la marca empresa.

## Referencias para agentes

Índice: `config/content-studio/brand-kit.json` (skill de tokens: `docs/brand/icso/design-system/SKILL.md`).

- **@opsly / control plane:** ojo ICSO + hexágono, navy `#0A0E27`, cyan `#00FFFF`. Prefijo de `image_prompt` lo aplica `content-studio-enqueue.sh`.
- **Universe:** `docs/brand/icso/universe/*.png` + `atlas-parallel-universes.jpg` — personajes, portales, islas Bitsitos/Splashitos.
- **No mezclar:** el ojo ICSO no es mascota de Universe; los niños exploradores no van al avatar de `@opsly`.

Copia local (gitignored): `runtime/content-studio/brand-assets/opsly-{avatar,banner}.png`.

## Publicar

```bash
npm run content:opsly:dry-run
npm run content:opsly:publish -- --kit

doppler run --project ops-intcloudsysops --config prd -- \
  npm run content:opsly:enqueue

npm run content:opsly:upload:next
```

Unlisted. Categoría **28** (Science & Technology). Tope compartido ~6 uploads/día.
