---
status: draft
owner: operations
last_review: 2026-05-24
type: guide
tags:
  - opsly/development
---

# Clientes a invitar — Opsly

Seguimiento manual; la fuente de verdad de tenants sigue siendo `platform.tenants` en Supabase.

## Tenants piloto

| Slug         | Email (debe ser `owner_email`) | Nombre / notas           | Estado    |
| ------------ | ------------------------------ | ------------------------ | --------- |
| peskids      | sierrasantiago90@gmail.com     | Owner Peskids            | Listo     |
| localrank    | jkbotero78@gmail.com           | Juan Carlos (ajustar)    | Pendiente |
| jkboterolabs | Mismo u otro según fila en DB  | Completar desde Supabase | Pendiente |

> **Importante:** `POST /api/invitations` solo acepta el email si coincide exactamente con `owner_email` del tenant (ver `docs/INVITATIONS_RUNBOOK.md`).

## Proceso de invitación

### Opción A: API (recomendado)

```bash
export PLATFORM_ADMIN_TOKEN="$(doppler secrets get PLATFORM_ADMIN_TOKEN --plain --project ops-intcloudsysops --config prd)"

./scripts/send-tenant-invitation.sh \
  --slug localrank \
  --email jkbotero78@gmail.com \
  --name "Juan Carlos"
```

Para Peskids, usa el wrapper tenant-scoped:

```bash
./scripts/send-peskids-invitation.sh --email sierrasantiago90@gmail.com --role owner
```

Si el usuario ya existe en Supabase, el mismo comando genera recovery en el tenant correcto.

Vista previa del template manual (no envía email):

```bash
./scripts/send-tenant-invitation.sh --slug localrank --email jkbotero78@gmail.com --name "Juan Carlos" --dry-run
```

### Opción B: curl directo

Ver ejemplo en `docs/INVITATIONS_RUNBOOK.md` (`tenantRef` + `email` + `mode`).

### Opción C: Email manual

1. Copiar `docs/emails/tenant-welcome-email.md`.
2. Sustituir `{NOMBRE_CLIENTE}` y `{TU_SLUG}`.
3. Enviar; el acceso real al portal sigue requiriendo flujo Supabase — la invitación oficial es vía API + Resend.

## Checklist post-invitación

- [ ] API devolvió `200` y `ok: true`.
- [ ] Cliente recibió email (Resend) o se reenvió enlace de forma segura.
- [ ] Cliente activó cuenta en `/invite/...`.
- [ ] Cliente probó n8n y Uptime (URLs por slug abajo).

## URLs por tenant (staging)

### LocalRank

- Portal: https://portal.op-sly.com
- n8n: https://n8n-localrank.op-sly.com
- Uptime: https://uptime-localrank.op-sly.com

### jkboterolabs

- n8n: https://n8n-jkboterolabs.op-sly.com
- Uptime: https://uptime-jkboterolabs.op-sly.com

---

## Enlaces relacionados

- [[01-development/README|01-development]]
- [[brain/README|Brain Central]]
