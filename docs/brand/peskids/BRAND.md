---
status: canon
owner: peskids
last_review: 2026-08-05
---

# Peskids brand kit

Fuente de identidad visual del tenant Peskids (academia de natación).

## Archivos

| Archivo | Uso |
|---------|-----|
| `logopeskids.ai` | Master Adobe Illustrator (cliente). No editar; exportar desde aquí. |
| `brand-board-reference.png` | Tablero de marca (paleta, tipo, mockups) |
| `logo-wordmark-reference.png` | Logo oficial circular (referencia) |
| `apps/peskids/public/brand/logo-official.png` | Logo en producción (web) |
| `apps/peskids/public/brand/logo-mark.svg` | Variante vectorial |
| `apps/peskids/public/brand/logo-mark.png` | PNG cuadrado para OG/email |
| `apps/peskids/public/brand/favicon-32.png` | Favicon |
| `apps/peskids/public/brand/apple-touch-icon.png` | Apple touch |

## Paleta en producción (`apps/peskids/lib/tokens.ts`)

Muestreada del logo oficial del kit:

| Nombre | Hex | Rol |
|--------|-----|-----|
| Azul | `#235A7F` | Ink / deep / headlines |
| Turquesa | `#54BFB1` | Primary / CTAs / theme |
| Naranja | `#F47259` | Accent |
| Coral | `#F0382B` | Alert / Instagram tone |
| Amarillo | `#E9AF17` | Highlight / sun |
| Azul claro | `#E6F6FB` | Fondos suaves |
| Blanco | `#FFFFFF` | Surface |

### Brand board (referencia histórica)

El tablero también documenta: `#0D4C63` `#2DB7B0` `#FF5A1F` `#FFC20E`. Producción usa los hex del logo oficial arriba.

## Tipografía

- UI / body: **Nunito** (`font-sans`)
- Acento de marca / brush: **Caveat Brush** (`font-brush`)

## Componentes

- `apps/peskids/components/brand/peskids-logo.tsx` — `PeskidsLogo` usa `/brand/logo-official.png`

## Nota sobre el `.ai`

El PDF embebido del `.ai` no rasteriza de forma fiable fuera de Illustrator. Conservamos el binario como fuente de verdad y publicamos PNG/SVG derivados del kit.
