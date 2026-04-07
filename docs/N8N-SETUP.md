# N8N Setup — Discord to GitHub

## Objetivo

Automatizar el flujo Discord -> GitHub para actualizar `docs/ACTIVE-PROMPT.md`
y notificar confirmacion de recepcion.

## Prerrequisitos

- n8n operativo en `https://n8n-intcloudsysops.ops.smiletripcare.com`
- Secretos en Doppler `prd`:
  - `GITHUB_TOKEN_N8N` (scope `repo`)
  - `DISCORD_WEBHOOK_URL`
  - `N8N_WEBHOOK_SECRET` (nuevo, recomendado)

## Importar workflow

1. En n8n: **Workflows** -> **Import from file**.
2. Seleccionar `docs/n8n-workflows/discord-to-github.json`.
3. Revisar nodos:
   - `Discord Webhook`
   - `Validate Message`
   - `Prepare ACTIVE-PROMPT`
   - `Get ACTIVE-PROMPT SHA`
   - `Update ACTIVE-PROMPT`
   - `Notify Discord Confirm`

## Variables requeridas en n8n

- `GITHUB_TOKEN_N8N`: token GitHub con permisos `repo`.
- `DISCORD_WEBHOOK_URL`: webhook del canal de notificaciones.
- `N8N_WEBHOOK_SECRET`: secreto compartido para validar origen.

## Configuracion sugerida del webhook

- Metodo: `POST`
- Payload esperado:

```json
{
  "content": "Tarea a ejecutar por Cursor",
  "author": { "username": "Cristian" }
}
```

- Header recomendado:
  - `X-Opsly-Secret: <N8N_WEBHOOK_SECRET>`

## Prueba manual

1. Exportar URL del webhook en `N8N_WEBHOOK_URL`.
2. Ejecutar:

```bash
curl -sk -X POST "$N8N_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Opsly-Secret: $N8N_WEBHOOK_SECRET" \
  -d '{"content":"# test\necho hello","author":{"username":"Cristian"}}'
```

3. Verificar:
   - commit nuevo sobre `docs/ACTIVE-PROMPT.md` (o update por API)
   - mensaje de confirmacion en Discord
   - ejecucion detectada por `cursor-prompt-monitor`

## Troubleshooting

- **401/403 GitHub API**: revisar `GITHUB_TOKEN_N8N` y scope `repo`.
- **No llega confirmacion a Discord**: revisar `DISCORD_WEBHOOK_URL`.
- **Webhook responde 200 pero no actualiza archivo**: validar obtencion de `sha` actual.
- **Cursor no ejecuta**: verificar `cursor-prompt-monitor` activo y logs en `/opt/opsly/logs/cursor-prompt-monitor.log`.
