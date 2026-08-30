---
status: active
owner: icso
last_review: 2026-08-10
type: product-line
---

# ICSO — Línea YouTube: natación para niños (Splashitos)

Canal de contenido **propio de ICSO / Opsly** para ingresos y learning loop de Content Studio.  
**No es Peskids.** No usar logo, dominio, WhatsApp ni copy de Peskids hasta autorización escrita del cliente.

## Posicionamiento

| Campo | Valor |
|-------|--------|
| Marca del canal | **Splashitos** |
| Nicho | Tips virales de natación / agua para niños (ES LatAm) |
| Formato primario | YouTube Shorts 30–45s (9:16) |
| Idioma | Español (LatAm neutro) |
| Dueño | ICSO (agencia) — incubado en monorepo Opsly |
| Render | PC gamer GPU → cola `content-video` → MoneyPrinterTurbo |
| Publicación | Manual al inicio (approval-first). Sin auto-upload API hasta política lista |

## Por qué no Peskids (aún)

- Sin autorización de marca / cliente.
- El canal debe poder vivir solo si Peskids no escala o no licencia la marca.
- Cuando haya OK: brand pack aparte + CTA a `www.peskids.com` (fase B).

## Cumplimiento (obligatorio)

1. **COPPA / “hecho para niños”:** al subir, marcar correctamente si el contenido está dirigido a niños. Preferir tono *para padres que enseñan a niños* si queremos comentarios/analytics; o “made for kids” si el avatar habla solo al niño (menos monetización social).
2. Sin promesas médicas, sin “aprender en 1 día”, sin peligro real en pantalla.
3. Música: solo tracks libres / YouTube Audio Library.
4. Voces/imagenes: no clonar personas reales sin contrato; avatares ilustrados OK.

## Setup del canal (humano + agente)

1. Cuenta Google del founder (la tuya) → YouTube Studio.
2. Crear canal **Splashitos** (o brand account si ya hay canal personal).
3. Handle sugerido: `@Splashitos` / `@SplashitosKids` (probar disponibilidad).
4. Descripción plantilla: ver `channel-about.txt` en este pack.
5. Banner + avatar: generar en lote creativo (sin marca Peskids).
6. Primeros 5 Shorts desde `batch-01-scripts.json` (estado `approved` solo tras revisión humana).

## Pipeline técnico Opsly

```
Guion JSON (este pack)
  → ContentDraft (tenant_slug: icso-splashitos)
  → BullMQ content-video (worker en PC gamer)
  → MoneyPrinterTurbo (GPU)
  → asset MP4 local / URL
  → humano sube a Studio (MVP)
```

Variables (Doppler / worker gamer, sin secretos en repo):

- `MONEY_PRINTER_TURBO_URL`
- `REDIS_URL` (VPS) para el worker `content-video`
- Opcional más adelante: YouTube Data API OAuth (fase publish)

Scripts:

- `npm run content:splashitos:enqueue -- --dry-run`
- `npm run content:splashitos:enqueue` (requiere Redis + worker)

## Monetización (horizonte)

1. Shorts + watch time → umbral Partner.
2. Super Thanks / membresía (después).
3. Leads ICSO: “¿Quieres academia de natación en tu ciudad?” → formulario ICSO (no Peskids).
4. Licencia de pack de contenido a otros tenants academia (Opsly product).

## Enlaces

- Pack: [`config/content-studio/channels/splashitos/`](../../../config/content-studio/channels/splashitos/)
- Content Studio: [`docs/00-architecture/CONTENT-STUDIO-ARCHITECTURE.md`](../../00-architecture/CONTENT-STUDIO-ARCHITECTURE.md)
- PC gamer worker: PR infra pc-gamer (#932)
