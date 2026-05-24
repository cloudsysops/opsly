---
status: draft
owner: operations
last_review: 2026-05-24
type: tenant
tags:
  - opsly/tenant
---

# Peskids — Instagram en la landing

Perfil oficial: [instagram.com/peskidsnatacion](https://www.instagram.com/peskidsnatacion/)

## Qué muestra la web

- Sección **Redes** (`#redes`) en la home con grid de 6 publicaciones.
- Cada tarjeta abre el post o reel en Instagram (fotos y videos).
- Botón **Seguir en Instagram** al perfil.

## Fotos y videos reales (recomendado)

1. En Instagram (móvil o web), abre cada publicación que quieras destacar.
2. Menú **⋯** → **Copiar enlace** (debe ser `https://www.instagram.com/p/...` o `/reel/...`).
3. En Doppler `ops-intcloudsysops` / `prd` (y en VPS `runtime/peskids.env`):

```bash
INSTAGRAM_POST_PERMALINKS=https://www.instagram.com/p/POST1/,https://www.instagram.com/reel/REEL1/,https://www.instagram.com/p/POST2/
```

4. Reconstruir y reiniciar el contenedor `peskids` en el VPS.

Sin esa variable, la web muestra **tarjetas de marca** (mismo estilo que el design pack) que enlazan al perfil.

## Código

| Archivo | Rol |
| -------- | ----- |
| `apps/peskids/lib/instagram-feed.ts` | Perfil + fallbacks |
| `apps/peskids/lib/instagram-oembed.ts` | Miniaturas vía API oEmbed |
| `apps/peskids/components/marketing/instagram-feed-section.tsx` | Sección en home |

## Límite técnico

Instagram no expone el feed completo sin **Meta Graph API** (cuenta business + token). Esta integración usa **oEmbed** por URL: ideal para 6–12 posts elegidos, sin contraseña de Instagram en el servidor.

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
