# Local Services — Phase 2 (automation / n8n)

Referencia para Cursor: `@` este archivo al trabajar **Phase 2** (webhooks, n8n, proveedores externos).

## Estado API (webhooks)

Implementado en la API:

| Método | Ruta | Cuerpo (JSON) | Efecto |
|--------|------|----------------|--------|
| POST | `/api/local-services/webhooks/{slug}/booking-created` | `{ "booking_id": "<uuid>" }` | Valida firma + tenant; comprueba que la reserva pertenece al `slug` |
| POST | `/api/local-services/webhooks/{slug}/booking-completed` | `{ "booking_id": "<uuid>" }` | Marca `ls_bookings.status = completed` |
| POST | `/api/local-services/webhooks/{slug}/reports/create` | `{ "title": "...", "body": {} }` | Inserta `ls_reports` |

**Firma:** `X-Opsly-Signature: sha256=<hex>` donde `<hex>` = HMAC-SHA256 del **raw body** (mismo string que envía n8n). Secretos: `LOCAL_SERVICES_WEBHOOK_SECRET` o `LOCAL_SERVICES_WEBHOOK_SECRET_<SLUG>` (ver `local-services-webhook-signature.ts`).

## Pendiente (según este prompt)

1. **5 workflows n8n** (JSON export bajo `docs/n8n-workflows/` o similar): booking creado → email/SMS; completado → Stripe/recibo; reporte → Drive; etc. (especificar en PR).
2. **SendGrid / Twilio / Stripe** en nodos n8n + variables Doppler; no hardcodear keys en el repo.
3. **Tests** adicionales de rutas si se requiere cobertura E2E con mocks de Supabase.

## ADR

- Phase 1 API: `docs/adr/ADR-041-local-services-phase-1-tenant-api.md`
- Phase 2 webhooks: `docs/adr/ADR-042-local-services-phase-2-webhooks.md`
