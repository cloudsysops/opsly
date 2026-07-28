---
status: canon
owner: architecture
last_review: 2026-07-28
---

# Auditoría — Peskids WhatsApp Integration (sandbox-first)

## Decisión de proveedor

| Rol | Elección |
|-----|----------|
| Proveedor funcional inicial | **Meta Cloud API** directo |
| WACRM | Adaptador **opcional**; apagado por defecto; no bloquea arranque |
| OpenWA | Biblioteca de tipos/HMAC reutilizable (`lib/openwa`); no es el transporte Meta |

## Evidencia actual (pre-plan)

- Webhook WACRM: `apps/peskids/app/api/webhooks/wacrm/route.ts` + `wacrm-inbound-handler.ts` — secreto de header, persistencia en `messages`, lead link.
- Compose WACRM en runtime es proxy Nginx de health / placeholder — **no** es transporte WhatsApp real.
- Smoke sintético WACRM ≠ mensaje real Meta.
- GHL legacy: rutas opt-in vía `PESKIDS_GHL_ENABLED`; deben responder disabled/410 sin activar producto.

## Estados (distintos)

| Estado | Significado |
|--------|-------------|
| `stub` | Código/proxy presente; sin transporte real |
| `configured` | Env/Doppler con IDs/secretos; flags OFF |
| `ready` | Firma + persistencia + approval path verificados en sandbox |
| `enabled` | Flag ON tras go/no-go humano — **prohibido en este plan** |

## Gaps cerrados por este plan (código)

1. `lib/whatsapp-channel/` — provider interface, Meta Cloud, verificación `X-Hub-Signature-256`, normalización, idempotencia.
2. Webhook Meta delgado en Peskids (firma directa; n8n solo post-persist).
3. Outbox approval-first + receipts (reutiliza `messages`; migración delta opcional sin aplicar).
4. Health WhatsApp que distingue stub vs configured vs ready.
5. Admin panel sandbox + runbooks + smokes fixture-only.
6. Contención GHL (410 cuando disabled).

## No incluido (requiere humano)

- Aplicar migraciones Supabase en prod
- Cargar secretos Meta reales en Doppler
- Activar `PESKIDS_WHATSAPP_ENABLED` / inbound Meta / outbound
- Cutover del número principal WhatsApp
- Imagen/contrato WACRM outbound real

## Contratos

- Flags: `docs/blueprints/academy/feature-flags.yaml`
- Meta/WACRM: `docs/blueprints/academy/whatsapp-contracts.yaml`
- Env tipado: `lib/whatsapp-channel/src/env-config.ts`
