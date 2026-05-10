# Opsly Stripe (marketplace / oficial)

> **Triggers:** `stripe marketplace`, `stripe best practices`, `checkout session`, `payment intent`, `go live stripe`, `stripe api version`, `integración stripe oficial`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-billing`, `opsly-api`, `opsly-tenant`
> **Origen:** adaptación de la skill *Stripe best practices* del marketplace Cursor; criterios alineados a documentación Stripe actual. No sustituye `opsly-billing` — complétala.

## Cuándo usar

- Diseñar o revisar flujos de pago / suscripción en Opsly.
- Decidir entre Checkout, PaymentIntents, Billing API o Connect.
- Antes de **go-live** o al auditar código nuevo en `apps/api` / `apps/web` / `apps/portal`.

## Mapa Opsly

| Tema            | Ubicación / acción                                              |
| --------------- | ---------------------------------------------------------------- |
| Billing dominio | `skills/user/opsly-billing/SKILL.md`, `apps/api/lib/billing/`     |
| Webhooks        | Firmar con `STRIPE_WEBHOOK_SECRET` (Doppler); raw body           |
| Precios / plans | `STRIPE_PRICE_ID_*` en Doppler; `apps/web/lib/stripe/plans.ts`   |
| Secretos        | Solo Doppler `ops-intcloudsysops/prd`; nunca `NEXT_PUBLIC_*` para secretos |

## Reglas resumidas (oficial Stripe)

1. **API:** usar versión reciente del SDK/API documentada por Stripe; no hardcodear en el repo — configurar vía dependencia y changelog del proyecto.
2. **On-session:** preferir **Checkout Sessions** (hosted o embedded) para pagos y suscripciones cuando aplique.
3. **Off-session / estado propio:** **PaymentIntents** o **SetupIntents** aceptables; no usar **Charges API** para integraciones nuevas.
4. **UI:** preferir Checkout o **Payment Element**; no recomendar **Card Element** legacy.
5. **Fuentes / Tokens:** evitar **Sources API** y flujos legacy para guardar métodos de pago; **SetupIntent** para guardar método.
6. **Suscripciones SaaS:** combinar **Billing / Subscriptions** con Checkout cuando el caso sea B2B SaaS (como Opsly).
7. **Connect:** seguir guía actual (controller properties / capabilities), no taxonomías legacy “Standard/Express” como decisión única.
8. **Go-live:** revisar checklist oficial Stripe antes de producción.

## Enlace a docs

- [Integration options](https://docs.stripe.com/payments/payment-methods/integration-options)
- [Checkout](https://docs.stripe.com/payments/checkout)
- [Go-live checklist](https://docs.stripe.com/get-started/checklist/go-live)

## Conflicto con arquitectura Opsly

- Toda **trazabilidad y políticas de costo LLM** siguen yendo por **OpenClaw → LLM Gateway** (`opsly-llm`). Esta skill es solo para **pagos y billing Stripe**.
