---
status: active
owner: operations
last_review: 2026-08-09
type: tenant
tags:
  - opsly/tenant
  - security
---

# Peskids — protección de datos personales (PII)

Datos de menores y documentos de adultos (cédula/NIT) se tratan como PII sensible.

## Controles en código

| Control | Qué hace |
|---------|----------|
| Webhooks fail-closed | Sin `PESKIDS_INBOUND_WEBHOOK_SECRET` / `JELOU_WEBHOOK_SECRET` → **503** (no aceptar tráfico anónimo) |
| Cifrado en reposo (campo) | `document_number` y `company_nit` se guardan con AES-256-GCM (`enc:v1:…`) vía `ENCRYPTION_SECRET` (32 chars) |
| Emails staff | Cédula/NIT solo enmascarados (`****1234`), nunca el valor completo |
| `redactPII` | Patrones CO (NIT, móvil, cédula) en `@intcloudsysops/security` |

## Doppler (`prd`)

```bash
# Generar ENCRYPTION_SECRET (exactamente 32 caracteres ASCII)
openssl rand -hex 16   # produce 32 hex chars — usar el output completo

doppler secrets set ENCRYPTION_SECRET="<32-chars>" \
  --project ops-intcloudsysops --config prd
```

Confirmar también `PESKIDS_INBOUND_WEBHOOK_SECRET` y `JELOU_WEBHOOK_SECRET`.

## Pendiente (fase 2)

- Migrar filas legacy (plaintext) a `enc:v1:`
- Cifrar o tokenizar `child_name` / `birth_date` (requiere migración de tipo `date` → texto cifrado)
- Redacción en exports CSV / logs de `webhook_logs`

## Enlaces

- Helper: `apps/api/lib/peskids/pii-crypto.ts`
- Ventana de cambio prod: `docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`
