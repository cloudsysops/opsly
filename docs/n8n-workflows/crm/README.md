# Opsly CRM Starter Pack

Workflows n8n plug-and-run para instalar en cualquier tenant Opsly.

## Workflows incluidos

| Archivo | Trigger | Proposito |
| --- | --- | --- |
| `crm-lead-capture.json` | `POST /webhook/opsly-crm-lead` | Captura y normaliza leads desde formularios, landing pages o integraciones |
| `crm-hot-lead-alert.json` | `POST /webhook/opsly-crm-hot-lead` | Calcula score y alerta si el lead es caliente |
| `crm-follow-up-reminder.json` | Cron 09:00 L-V | Recordatorio diario de seguimiento comercial |
| `crm-daily-pipeline-digest.json` | Cron 17:30 L-V | Digest de cierre del pipeline |

## Variables por tenant

Configurar en el contenedor n8n del tenant o en su entorno:

| Variable | Requerida | Uso |
| --- | --- | --- |
| `TENANT_SLUG` | Recomendada | Identifica el tenant en mensajes y payloads. Los nuevos stacks ya la reciben desde el template compose. |
| `OPSLY_CRM_NOTIFY_WEBHOOK_URL` | Recomendada | Webhook Slack/Discord/Teams para avisos CRM |

Los workflows no incluyen secretos ni credenciales. Si `OPSLY_CRM_NOTIFY_WEBHOOK_URL` no existe, el nodo de notificacion falla en modo tolerante (`continueOnFail`) y el workflow sigue siendo importable/testeable.

## Instalar en un tenant

Dry-run:

```bash
./scripts/install-crm-workflows.sh --tenant smiletripcare --dry-run
```

Importar en el contenedor `n8n_<slug>`:

```bash
./scripts/install-crm-workflows.sh --tenant smiletripcare
```

Importar en todos los n8n que esten corriendo:

```bash
./scripts/install-crm-workflows.sh --all-running --force
```

El instalador valida slugs/contenedores y omite workflows ya existentes salvo que uses `--force`.

## Activacion

Por seguridad los workflows se importan inactivos. Activarlos desde la UI de n8n del tenant despues de revisar:

1. `https://n8n-<slug>.<PLATFORM_DOMAIN>/`
2. Workflows -> seleccionar workflow CRM
3. Probar con `Execute workflow`
4. Activar

## Prueba lead capture

```bash
curl -X POST "https://n8n-<slug>.<PLATFORM_DOMAIN>/webhook/opsly-crm-lead" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "demo",
    "name": "Ana Cliente",
    "email": "ana@example.com",
    "phone": "+1 555 0100",
    "company": "ACME",
    "source": "landing",
    "deal_value": 1500
  }'
```
