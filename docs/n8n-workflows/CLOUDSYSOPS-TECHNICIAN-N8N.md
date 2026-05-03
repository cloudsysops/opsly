# CloudSysOps technician — n8n (stub)

Fase 3 del plan (WhatsApp / SMS / PDF / Stripe) **no está cableada en código** aún. Cuando existan webhooks estables:

1. **Booking creado** — disparar desde la app/API cuando tengas URL de workflow (p. ej. `POST` al webhook n8n del tenant) con `booking_id`, `tenant_slug`, `customer_phone`.
2. **Servicio completado** — tras `POST /api/admin/local-services/{slug}/bookings/{id}/complete`, encolar el mismo patrón con `report_id` + `booking_id`.

Contratos HTTP públicos actuales (sin OpenClaw):

- `POST /api/local-services/public/tenants/{slug}/bookings`
- `GET /api/local-services/public/tenants/{slug}/available-slots?date=YYYY-MM-DD&service_external_id=pc-cleanup`

Referencia de preset y metadata: `config/technician-tenant/cloudsysops.metadata.json` y `apps/api/lib/technician-tenant-profile.ts`.
