---
status: active
owner: product
last_review: 2026-05-22
tenant_slug: peskids
---

# Peskids — design pack (Napkin / ZIP)

Fuente original: `peskids.zip` (Napkin export, 2026-05-21). Copia canónica en repo:

`docs/tenants/peskids/design-pack/` — JSX/HTML de referencia (sin binarios pesados).

## ¿Está en producción (`apps/peskids`)?

**Sí, parcialmente alineado.** La app Next.js usa la misma identidad que el ZIP:

| Elemento ZIP | Implementación en repo |
|--------------|-------------------------|
| Paleta `#0D4C63`, `#2DB7B0`, `#FF5A1F`, `#FFC20E`, `#E6F6FB` | `lib/brand.ts`, `tailwind.config.ts` (`pk-*`) |
| Tipografía Nunito + Caveat Brush + JetBrains Mono | `app/layout.tsx` (variables CSS) |
| Logo / lockup / ondas | `components/brand/peskids-logo.tsx` |
| Landing editorial (V1 “Sereno aquí debajo”) | `app/page.tsx` → `HeroSection`, `LevelsSection`, `LeadCaptureForm`, … |
| Portal familias / app-flow | `app/familias/page.tsx` → `components/marketing/portal-showcase.tsx` (puerto desde `src/app-flow.jsx` / `design-canvas.jsx`) |
| Admin operación | `app/admin/*`, `components/admin/*` |
| Niveles de natación (6) | `SWIM_LEVELS` en `lib/brand.ts` |

**No portado 1:1 (a propósito):** `LandingV1`/`LandingV2` monolíticos del ZIP; en prod están **componentizados** y con APIs reales (`/api/leads`, `/api/webhooks/inbound`, admin con cookie).

## Cómo validar visualmente

1. Prod: https://peskids.op-sly.com y https://peskids.op-sly.com/familias  
2. Local: `cd apps/peskids && doppler run --project ops-intcloudsysops --config prd -- npm run dev` → `:3004`  
3. Referencia estática: abrir `docs/tenants/peskids/design-pack/Peskids.html` en el navegador (vista Napkin completa).

## Assets pesados

Screenshots y logo PNG grandes del ZIP viven en `uploads/` del archivo original (~2 MB). En repo solo:

- `apps/peskids/public/brand/logo-reference.png` (referencia)
- Mantener el `.zip` local si hace falta comparar capturas.

## Próximos deltas de diseño (opcional)

- Tarifas / pricing cards del `landing.jsx` V1 → sección en landing si el owner lo pide.  
- `onboarding.jsx` / `app-home.jsx` → rutas bajo `/familias` o portal real con auth Opsly.  
- `print.jsx` / `Peskids-print.html` → PDF o página `/print` para material impreso.

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
