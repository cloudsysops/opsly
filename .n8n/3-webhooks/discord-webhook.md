# Discord Webhook — Configuración n8n

Configuración del webhook Discord para recibir tareas y enviar respuestas.

## URL del Webhook

```bash
# Producción (smiletripcare)
N8N_URL="https://n8n-smiletripcare.ops.smiletripcare.com/webhook/opsly-discord-task"

# Verificar desde Doppler
N8N_WEBHOOK_URL=$(doppler secrets get N8N_WEBHOOK_URL --plain --project ops-intcloudsysops --config prd)
```

## Formato de Mensajes

El webhook acepta JSON con:

```json
{
  "content": "# Tarea desde Discord\n# Fecha: 2026-04-29\n# Autor: Cristian\n\nDescripción de la tarea...",
  "author": { "username": "Cristian" },
  "target": "claude",
  "dry_run": false
}
```

## Validación

```bash
# Test básico (requiere N8N_WEBHOOK_URL y N8N_WEBHOOK_SECRET_GH)
./scripts/test-n8n-webhook.sh

# Test manual
curl -X POST "$N8N_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Opsly-Secret: ${N8N_WEBHOOK_SECRET_GH:-test}" \
  -d '{"content": "# Test desde setup\n# Fecha: now\n\necho hello","author":{"username":"Test"}}'
```

## Flujo Discord → GitHub

1. Usuario envía mensaje con `@claude` o `@billy` en Discord
2. n8n valida: contenido no vacío y longitud > 10
3. Prepara ACTIVE-PROMPT.md con el mensaje
4. n8n hace GET a GitHub para obtener SHA del archivo
5. n8n hace PUT a GitHub para actualizar `docs/ACTIVE-PROMPT.md`
6. Monitor VPS (`billy-prompt-monitor`) detecta cambios y ejecuta
7. n8n notifica resultado en Discord

## Referencias

- `docs/n8n-workflows/discord-to-github.json` — definición del workflow
- `scripts/test-n8n-webhook.sh` — smoke tests
- `AGENTS.md` → "Ecosistema IA — OpenClaw" (flujo completo)
- `docs/N8N-SETUP.md` — configuración inicial
