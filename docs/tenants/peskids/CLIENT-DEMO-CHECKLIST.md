---
status: active
owner: operations
last_review: 2026-05-19
tenant_slug: peskids
---

# Peskids — checklist demo cliente (WhatsApp + panel)

Duración orientativa: **10 minutos**. Secretos solo en **Doppler** (`ops-intcloudsysops` / `prd`).

**Última actualización prod wacrm:** 2026-07-06 — inbox oficial vía `POST /api/webhooks/wacrm` (approval-first, sin auto-envío).

## Reunión cliente — producción (2026-07-06)

**URLs listas:**

| Qué | URL |
|-----|-----|
| Landing | https://peskids.op-sly.com |
| Admin login | https://peskids.op-sly.com/admin/login |
| n8n (opcional) | https://n8n-peskids.op-sly.com |

**Mensaje clave:** «Nada sale por WhatsApp sin tu aprobación. Los mensajes entrantes aparecen en el panel; tú apruebas o copias y envías manualmente.»

**Demo WhatsApp sin Baileys (recomendado hoy):** simula un inbound wacrm (no imprime secretos):

```bash
doppler run --project ops-intcloudsysops --config prd -- bash -c '
curl -sS -X POST "https://peskids.op-sly.com/api/webhooks/wacrm" \
  -H "Content-Type: application/json" \
  -H "x-wacrm-webhook-secret: $WACRM_PESKIDS_WEBHOOK_SECRET" \
  -d "{
    \"tenant_slug\": \"peskids\",
    \"provider\": \"wacrm\",
    \"event_type\": \"inbound_message\",
    \"external_message_id\": \"demo-$(date +%s)\",
    \"phone\": \"+573001112233\",
    \"contact_name\": \"Padre Demo\",
    \"body\": \"Hola, quiero información de la clase de prueba\",
    \"direction\": \"inbound\"
  }"
'
```

Esperar **HTTP 201** → abrir **Admin → Mensajes** y mostrar el hilo (badge **wacrm**, estado pendiente).

**Pendiente post-reunión (no bloquea demo):** sidecar `https://wa-peskids.op-sly.com`, n8n `wacrm-peskids-inbound` publicado con secret en env n8n. Ver [WACRM-RUNBOOK.md](./WACRM-RUNBOOK.md).

## Qué hay en Doppler (nombres, sin valores)

| Secreto | Uso en la demo |
|---------|----------------|
| `WACRM_PESKIDS_WEBHOOK_SECRET` | Header `x-wacrm-webhook-secret` en `POST /api/webhooks/wacrm` (**canal nuevo**) |
| `JELOU_WEBHOOK_SECRET` | Header legacy `x-webhook-secret` en `/api/webhooks/inbound` (GHL/Jelou; no es el flujo nuevo) |
| `DASHBOARD_ADMIN_SECRET` | Login en `/admin/login` y API del panel |
| `TENANT_PESKIDS_N8N_USER` / `TENANT_PESKIDS_N8N_PASS` | UI n8n `https://n8n-peskids.op-sly.com` |
| `N8N_WEBHOOK_BASE_URL` | Base webhooks n8n (`…/webhook/peskids-whatsapp`) |
| `PESKIDS_INBOUND_WEBHOOK_URL` | URL del app (`https://peskids.op-sly.com/api/webhooks/inbound`) |

No hay variable `WHATSAPP_*` en Doppler hoy: el número va en **WhatsApp Business / Baileys (QR)** o en **Jelou**. El webhook usa el secreto anterior.

## Antes de la reunión (15 min)

1. **Supabase:** aplicar migraciones si falta la tabla `messages`:
   - `apps/peskids/migrations/001_create_peskids_schema.sql`
   - `apps/peskids/migrations/002_add_messages_table.sql`
2. **Desplegar** app Peskids con el código actual (ruta `/api/webhooks/inbound` + `/admin/login`).
3. **Smoke automático** (Mac, no imprime secretos):

```bash
cd /ruta/al/repo
./scripts/test-peskids-client-demo.sh
```

4. **n8n (opcional, WhatsApp real):** en el VPS:

```bash
ssh vps-dragon@100.120.151.91
cd /opt/opsly && git pull --ff-only origin main
./scripts/install-peskids-n8n-workflows.sh
```

Luego en n8n: activar workflow, escanear QR Baileys con **tu WhatsApp** (el del cliente).

## Guión en pantalla (cliente)

| Paso | URL / acción | Qué decir |
|------|----------------|-----------|
| 1 | `https://peskids.op-sly.com` | Landing, niveles, confianza |
| 2 | Formulario «Clase de prueba gratis» | Lead entra al sistema (API pública) |
| 3 | `https://peskids.op-sly.com/admin/login` | Token desde Doppler `DASHBOARD_ADMIN_SECRET` |
| 4 | `/admin` | Tarjetas: leads, mensajes WhatsApp, feedback |
| 5 | Otro celular → WhatsApp del negocio | Si wacrm sidecar + n8n activos; **hoy:** usar curl wacrm arriba |
| 6 | Simular inbound wacrm | `POST /api/webhooks/wacrm` (ver sección reunión 2026-07-06) |
| 7 | (legacy) `./scripts/test-peskids-client-demo.sh` | Simula `/api/webhooks/inbound` si hace falta |

## Probar solo WhatsApp (sin Baileys)

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  curl -sk -X POST "https://peskids.op-sly.com/api/webhooks/inbound" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $JELOU_WEBHOOK_SECRET" \
  -d '{"source":"whatsapp","from":"573001112233","name":"Padre Demo","text":"Quiero información","messageId":"demo-1"}'
```

Luego abrir `/admin` y confirmar el mensaje en **Mensajes entrantes**.

## Si algo falla

| Síntoma | Acción |
|---------|--------|
| `POST /api/webhooks/wacrm` → 401 | `WACRM_PESKIDS_WEBHOOK_SECRET` en Doppler + header correcto |
| `POST inbound` → 401 | Revisar `JELOU_WEBHOOK_SECRET` (flujo legacy) |
| `POST inbound` → 500 | Tabla `messages` no existe → migración 002 en Supabase |
| Panel vacío tras login | `GET /api/dashboard` debe ser 200; cookie `admin-token` tras login |
| n8n webhook 404 | Ejecutar `install-peskids-n8n-workflows.sh` y `publish:workflow` |
| Baileys no conecta | Re-escanear QR en n8n; ver [N8N-SETUP.md](./N8N-SETUP.md) |

## Referencias

- [PHASE-2-CHECKLIST.md](./PHASE-2-CHECKLIST.md)
- [N8N-SETUP.md](./N8N-SETUP.md)
- [DEMO-SCRIPT.md](./DEMO-SCRIPT.md) (pitch verbal)
- [WACRM-RUNBOOK.md](./WACRM-RUNBOOK.md)

---

## Enlaces relacionados

- [[tenants/peskids/README|peskids]]
- [[brain/README|Brain Central]]
