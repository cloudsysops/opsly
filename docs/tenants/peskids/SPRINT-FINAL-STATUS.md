---
status: active
owner: product/operations
last_review: 2026-07-07
---

# Peskids Sprint Final Status — Academy Production

> **Estado:** `ACADEMY_PRODUCTION_READY` · **wacrm:** `WACRM_INBOUND_READY`  
> **Última verificación:** 2026-07-07T23:05Z  
> **Imagen prod:** `f88a23d4`+ (main incluye #702, #703, #706)

---

## Resumen ejecutivo

El loop academia Peskids está **cerrado en producción**:

lead → WhatsApp inbound (wacrm/n8n) → mensaje en Supabase → lead vinculado/creado → admin inbox → digest con pendientes.

| Hito | Estado |
|------|--------|
| PR #702 — Dockerfile wompi + digest `recommended_next_action` | ✅ merged + deployed |
| PR #703 — wacrm Normalize payload (fix n8n 500) | ✅ merged |
| PR #706 — badge wacrm con historial por contacto | ✅ merged |
| Migración `005_message_approval_status.sql` | ✅ aplicada en Supabase |
| n8n `wacrm-peskids-inbound` | ✅ HTTP 200 en prod |
| Wompi | ⏸ inactivo por diseño (sandbox pendiente) |
| Twenty CRM | ❌ fuera de alcance academy loop |

---

## Smoke producción (2026-07-07)

| Check | Resultado |
|-------|-----------|
| `POST n8n …/webhook/wacrm-peskids-inbound` (payload QA) | ✅ **200** — `message_id`, `lead_id` |
| `POST /api/webhooks/wacrm` sin secret | ✅ **401** fail-closed |
| `GET /api/health` | ✅ ok |
| Digest `recommended_next_action` | ✅ live (post #702) |
| Auto-send WhatsApp en inbound | ✅ no — approval-first |

Payload QA usado en smoke:

```json
{
  "tenant_slug": "peskids",
  "provider": "wacrm",
  "event_type": "inbound_message",
  "external_conversation_id": "qa-conv-<ts>",
  "external_message_id": "qa-msg-<ts>",
  "phone": "+14014427099",
  "contact_name": "QA WhatsApp Parent",
  "body": "Hola, quiero información de clases de natación",
  "direction": "inbound",
  "timestamp": "<ISO>",
  "metadata": { "source": "n8n-smoke" }
}
```

Re-smoke rápido:

```bash
curl -sS -w "\nHTTP:%{http_code}\n" -X POST \
  "https://n8n-peskids.op-sly.com/webhook/wacrm-peskids-inbound" \
  -H "Content-Type: application/json" \
  -d '{"from":"+573001112233","body":"smoke wacrm inbound"}'
```

---

## wacrm inbound — causa y fix (cerrado)

**Root cause:** nodo n8n **Normalize payload** no mapeaba `from` → `phone` ni generaba `external_message_id` → Peskids `400` → n8n webhook `500`.

**Fix:** PR #703 — mapeo `phone|from|sender|wa_id`, `body|text|message`, `external_message_id` auto-generado. Workflow canónico: `.n8n/1-workflows/peskids/peskids-wacrm-inbound.json`.

**Re-aplicar en VPS** (solo si n8n se desincroniza):

```bash
cd /opt/opsly && git pull --ff-only
./scripts/install-peskids-n8n-workflows.sh --force
```

Detalle: `docs/tenants/peskids/WACRM-RUNBOOK.md` → sección *n8n inbound recovery*.

---

## Listo para cliente

1. Landing y captación de leads — `peskids.op-sly.com`
2. Admin — leads, alumnos, follow-ups, mensajes, agenda, clases de prueba
3. Inbox WhatsApp (wacrm) — approval-first, `/admin/messages`
4. Follow-ups, trial classes, portal familias/docentes
5. Digest diario con `recommended_next_action`
6. Pipeline Active Student → Renewal
7. n8n workflows exportados e importables en VPS

---

## Backlog (no bloquea academy)

| Item | Notas |
|------|-------|
| Wompi sandbox | Confirmar `payment_link_id` antes de `WOMPI_*_ENABLED=true` |
| Migración wompi columns | `20260706_add_wompi_payment_provider.sql` — solo si se activa Wompi |
| AcademyOpsMap en dashboard | Componente existe, no montado |
| Billing mensual / suscripciones | Producto futuro |
| AI copiloto real | Digest hoy es determinístico |
| Twenty CRM sync | Gate separado |

---

## Migraciones

| Archivo | Estado |
|---------|--------|
| `005_message_approval_status.sql` | ✅ aplicada |
| `20260706_add_wompi_payment_provider.sql` | ⏳ pendiente hasta activar Wompi |

---

## PRs de cierre (referencia)

- [#702](https://github.com/cloudsysops/opsly/pull/702) — wompi Dockerfile + digest
- [#703](https://github.com/cloudsysops/opsly/pull/703) — wacrm normalize payload
- [#706](https://github.com/cloudsysops/opsly/pull/706) — wacrm lead badge historial

---

## Siguiente acción

**Operativa (VPS):** tras merge de #706, confirmar imagen Peskids desplegada y reimport n8n solo si el webhook deja de responder 200:

```bash
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && git pull --ff-only && bash scripts/peskids-rebuild-vps.sh'
```

**Producto:** validar Wompi sandbox cuando el cliente quiera cobros en línea (sin activar flags hasta confirmar payload).

---

*Actualizado: 2026-07-07 — Academy + wacrm inbound loop cerrado*
