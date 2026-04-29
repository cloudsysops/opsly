# GitHub Webhook — Configuración n8n

Configuración para que n8n reciba eventos de GitHub (opcional).

## GitHub App / Webhook Secret

```bash
# Configurar en Doppler prd
doppler secrets set GITHUB_WEBHOOK_SECRET --project ops-intcloudsysops --config prd

# O usar token de GitHub
doppler secrets set GITHUB_TOKEN_N8N --project ops-intcloudsysops --config prd
```

## Eventos a Recibir

| Evento | Propósito |
|--------|-----------|
| `push` | Detectar cambios en main |
| `pull_request` | Validar PRs |
| `issues` | Responder issues automáticamente |

## URL del Webhook GitHub

```bash
# n8n debe exponer un endpoint para GitHub
GITHUB_WEBHOOK_URL="https://n8n-smiletripcare.ops.smiletripcare.com/webhook/github-event"

# Configurar en GitHub repo settings → Webhooks
# Content type: application/json
# Secret: $GITHUB_WEBHOOK_SECRET
```

## Validación

```bash
# Test webhook GitHub (debe devolver 200 o 401 si falta secret)
curl -X POST "$GITHUB_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"action":"opened","pull_request":{"title":"Test"}}'
```

## Referencias

- `.n8n/1-workflows/discord-to-github.json` — workflow que lee ACTIVE-PROMPT
- `AGENTS.md` → "Ecosistema IA" (GitHub → VPS → Cursor)
- `scripts/billy-prompt-monitor.sh` — monitor VPS
