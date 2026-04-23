# ADR-030 — Wallet prepago y “tokens” de cuenta (roadmap)

## Estado

**Propuesto / borrador** — alineado con `docs/TOKEN-BILLING-SYSTEM.md`.

## Contexto

El producto puede describirse con **créditos internos** (tokens abstractos) cargados por el cliente. Hoy Opsly mide **USD** y tokens de **proveedor** vía LLM Gateway + `usage_events`, con **planes Stripe** y **presupuestos** opcionales.

## Decisión (ahora)

1. **No** añadir `apps/billing` ni Redis `wallet:{tenant}:balance` hasta definir contabilidad, impuestos y conciliación con Stripe.
2. La **optimización de costos** sigue en **LLM Gateway** (caché, `routing_bias`, `PLAN_BUDGETS`, `force_cheap`).
3. Cualquier wallet prepago debe **mapear** créditos ↔ USD ↔ coste real de APIs para no perder margen.

## Consecuencias

- Documentación de producto en `docs/TOKEN-BILLING-SYSTEM.md` sin código de wallet.
- Si se implementa: nuevas tablas Supabase o ledger, webhooks de pago, y revisión legal.

## Referencias

- `docs/TOKEN-SYSTEM-GUIDE.md`
- `docs/llm-gateway` (código `budget.ts`, `logger.ts`)
