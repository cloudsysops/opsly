---
status: active
owner: operations
last_review: 2026-05-19
tenant_slug: peskids
---

# Peskids — checklist demo cliente (WhatsApp + panel)

Duración orientativa: **10 minutos**. Secretos solo en **Doppler** (`ops-intcloudsysops` / `prd`).

## Qué hay en Doppler (nombres, sin valores)

| Secreto | Uso en la demo |
|---------|----------------|
| `JELOU_WEBHOOK_SECRET` | Header `x-webhook-secret` en mensajes entrantes (WhatsApp simulado o n8n) |
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
| 5 | Otro celular → WhatsApp del negocio | Si n8n+Baileys activo, mensaje en panel en ~2 s |
| 6 | (alternativa) `./scripts/test-peskids-client-demo.sh` | Simula WhatsApp si Baileys no está listo |

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
| `POST inbound` → 401 | Revisar `JELOU_WEBHOOK_SECRET` en Doppler y en el header |
| `POST inbound` → 500 | Tabla `messages` no existe → migración 002 en Supabase |
| Panel vacío tras login | `GET /api/dashboard` debe ser 200; cookie `admin-token` tras login |
| n8n webhook 404 | Ejecutar `install-peskids-n8n-workflows.sh` y `publish:workflow` |
| Baileys no conecta | Re-escanear QR en n8n; ver [N8N-SETUP.md](./N8N-SETUP.md) |

## Referencias

- [PHASE-2-CHECKLIST.md](./PHASE-2-CHECKLIST.md)
- [N8N-SETUP.md](./N8N-SETUP.md)
- [DEMO-SCRIPT.md](./DEMO-SCRIPT.md) (pitch verbal)
- [WHATSAPP-CHANNEL.md](./WHATSAPP-CHANNEL.md)
