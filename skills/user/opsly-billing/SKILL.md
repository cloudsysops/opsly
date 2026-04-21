# Opsly Billing Skill

> **Triggers:** `stripe`, `billing`, `suscripción`, `subscription`, `invoice`, `factura`, `metering`, `usage`, `plan`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-api`, `opsly-supabase`, `opsly-tenant`, `opsly-qa`

## Cuándo usar

Al crear o modificar lógica de facturación en `apps/api` y `apps/portal`: suscripciones, metering, webhooks Stripe, creación de facturas y sincronización de planes por tenant.

## Áreas de código

- API billing: `apps/api/app/api/billing/`
- Lógica de dominio: `apps/api/lib/billing/`
- Migraciones: `supabase/migrations/*billing*`
- UI portal billing: `apps/portal/app/dashboard/[tenant]/subscriptions/`

## Contrato mínimo de billing

1. Todo evento de consumo debe estar atado a `tenant_slug`.
2. Stripe webhook debe validar firma antes de procesar evento.
3. Cambios de plan deben ser idempotentes.
4. Persistencia en DB debe usar schema `platform` + tipos estrictos.
5. Nunca exponer secretos Stripe en frontend.

## Patrón de endpoint billing

```ts
// apps/api/app/api/billing/subscriptions/route.ts
import { NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/auth";
import { syncSubscriptionForTenant } from "@/lib/billing/subscription-service";

export async function POST(request: Request): Promise<Response> {
  requireAdminToken(request);
  const body = await request.json();
  const result = await syncSubscriptionForTenant(body);
  return NextResponse.json({ ok: true, data: result });
}
```

## Reglas

- Stripe API key y webhook secret solo desde Doppler.
- Todos los montos en centavos o decimal normalizado; no mezclar.
- Idempotency key obligatoria en mutaciones críticas.
- Webhook handler debe ignorar eventos no soportados, no romper todo el flujo.
- Cada cambio de billing debe tener tests de éxito y de error.

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `signature verification failed` | Secret inválido o payload alterado | Verificar `STRIPE_WEBHOOK_SECRET` y raw body |
| Doble cobro | Falta idempotencia | Usar `idempotency_key` + upsert defensivo |
| Plan no refleja en portal | Sync incompleto API→DB | Asegurar update en `subscription-service` y re-fetch UI |
| 500 en invoice creation | Tenant sin customer Stripe | Crear/validar `stripe_customer_id` antes de facturar |
