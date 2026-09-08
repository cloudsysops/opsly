# Overnight OpenCode — wire real AI video rendering into content-video worker

Eres OpenCode en el worktree overnight de Opsly (`~/opsly-overnight`). Trabaja
solo en esa raíz. No hagas force-push. No edites `main` directamente. Abre o
actualiza una rama `overnight/*` y un PR contra `main`.

## Contexto

Esta noche arreglamos el pipeline `content-video` (BullMQ → worker →
MoneyPrinter bridge en pc-gamer). Funciona de punta a punta, pero el bridge
(`scripts/moneyprinter-bridge.mjs` → `scripts/ops/content-render-ffmpeg.mjs`)
solo genera un **title card estático simple** (ffmpeg, sin imagen real ni
narración) — no el video completo que el proyecto ya sabe producir.

Ya existe un cliente REAL para esto, implementado y documentado en
`docs/00-architecture/CONTENT-PRODUCTION-MVP.md`:
`lib/content-studio/src/rendering/moneyprinterturbo.ts`
(`MoneyPrinterTurboRenderClient` + `buildMoneyPrinterTurboPayload`) — genera
video con imagen AI + narración + subtítulos, no un placeholder. Produjo
renders reales completos el 2026-08-11 (ver
`runtime/content-studio/renders/*.mp4`, 10-30MB c/u, ya en el Mac).

También existe un Character Bible (`data/content/characters/`: Opsly
Founder, Luna, Wavo, The Traveler, NØVA) y un design system de marca
(`docs/brand/icso/design-system/`) — usa esos assets/tono para que el
contenido se vea profesional, moderno, futurista y consistente con la marca
Opsly/ICSO, no genérico.

## Tarea

1. Investiga por qué el worker `content-video`
   (`apps/orchestrator/src/workers/...`) actualmente llama al bridge simple
   en vez de `MoneyPrinterTurboRenderClient`. Lee
   `docs/00-architecture/CONTENT-PRODUCTION-MVP.md` completo primero.
2. Determina qué necesita el cliente real para funcionar en pc-gamer: ¿un
   backend MoneyPrinterTurbo real corriendo (Python, TTS + fuente de
   imágenes)? ¿Qué API keys hacen falta en Doppler
   (`ops-intcloudsysops/prd`)? Documenta el gap exacto si falta
   infraestructura — **no inventes ni simules una llamada exitosa**.
3. Si es viable sin nueva infraestructura pesada (ej. el backend ya corre en
   algún lado, o hay una ruta más simple con recursos ya disponibles):
   conecta `MoneyPrinterTurboRenderClient` al worker `content-video`,
   respetando el Character Bible y el brand kit para prompts de imagen.
4. Si NO es viable esta noche (falta backend/API keys reales): no fuerces
   nada. Deja un PR de documentación clara (`docs/runbooks/` o actualiza
   `CONTENT-PRODUCTION-MVP.md`) con: qué falta exactamente, qué decisión
   humana se necesita (¿levantar MoneyPrinterTurbo en Docker en pc-gamer?
   ¿qué proveedor de imagen/TTS usar y con qué budget?), y un plan concreto
   de 2-3 pasos para la próxima sesión.
5. Corre `npm run type-check` del workspace tocado si hay TS. No toques
   Stripe live, migraciones prod, ni compose de plataforma salvo que ya esté
   mergeado.

Deja un resumen en el PR: qué encontraste, qué conectaste (si algo), qué
decisión humana falta, y cómo probarlo.
