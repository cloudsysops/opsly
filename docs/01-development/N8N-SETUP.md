# N8N Setup — Discord to GitHub

> **Token GitHub:** el nombre **`GITHUB_TOKEN_N8N`** es histórico (cuando n8n llamaba a la API). En Doppler usa **`GITHUB_TOKEN`** como nombre principal; el código y los workflows aceptan cualquiera de los dos. Detalle: [`GITHUB-TOKEN.md`](./GITHUB-TOKEN.md).
>
> **Secreto webhook (header `X-Opsly-Secret`):** el nombre canónico en Doppler es **`N8N_WEBHOOK_SECRET_GH`** (flujo Discord→GitHub / pruebas `curl` y `dispatch-discord-command.sh`). Sustituye al nombre antiguo **`GITHUB_N8N`** (si aún existe en Doppler, migrar el valor a `N8N_WEBHOOK_SECRET_GH` y borrar la clave vieja). El nombre **`N8N_WEBHOOK_SECRET`** queda como legado intermedio; los scripts leen primero `N8N_WEBHOOK_SECRET_GH`, luego `N8N_WEBHOOK_SECRET`, luego `GITHUB_N8N` si hace falta.

## Objetivo

Automatizar el flujo Discord -> GitHub para actualizar `docs/ACTIVE-PROMPT.md`
y notificar confirmacion de recepcion.

## Prerrequisitos

- n8n operativo en `https://n8n-intcloudsysops.ops.smiletripcare.com`
- Secretos en Doppler `prd`:
  - `GITHUB_TOKEN` o `GITHUB_TOKEN_N8N` (scope `repo` o Contents en el repo)
  - `DISCORD_WEBHOOK_URL`
  - `N8N_WEBHOOK_SECRET_GH` (secreto compartido webhook; legados: `N8N_WEBHOOK_SECRET`, `GITHUB_N8N`)

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

- `GITHUB_TOKEN` (recomendado) o `GITHUB_TOKEN_N8N` (legado): PAT con permisos `repo` / Contents.
- `DISCORD_WEBHOOK_URL`: webhook del canal de notificaciones.
- `N8N_WEBHOOK_SECRET_GH`: secreto compartido para validar origen (legados: `N8N_WEBHOOK_SECRET`, `GITHUB_N8N`).

## Configuracion sugerida del webhook

- Metodo: `POST`
- Payload esperado:

```json
{
  "content": "@cursor Tarea a ejecutar",
  "author": { "username": "Cristian" },
  "target": "cursor"
}
```

- Header recomendado:
  - `X-Opsly-Secret: <N8N_WEBHOOK_SECRET_GH>`

## Prueba manual

1. Exportar URL del webhook en `N8N_WEBHOOK_URL`.
2. Ejecutar:

```bash
curl -sk -X POST "$N8N_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Opsly-Secret: $N8N_WEBHOOK_SECRET_GH" \
  -d '{"content":"# test\necho hello","author":{"username":"Cristian"}}'
```

1. Verificar:
   - commit nuevo sobre `docs/ACTIVE-PROMPT.md` (o update por API)
   - mensaje de confirmacion en Discord
   - ejecucion detectada por `cursor-prompt-monitor`

## Dispatch automatizado (recomendado)

Para no construir payloads a mano en cada prueba, usar el helper:

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/dispatch-discord-command.sh --content "# smoke\necho n8n-ok"
```

Opcionalmente, enviar contenido desde archivo:

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/dispatch-discord-command.sh --file ./docs/ACTIVE-PROMPT.md --dry-run
```

Flujo esperado:

- `dispatch-discord-command.sh` responde `Webhook n8n OK`.
- n8n actualiza `docs/ACTIVE-PROMPT.md` en GitHub.
- `cursor-prompt-monitor` detecta el cambio y ejecuta.
- `notify-discord.sh` publica inicio/fin o error.

## Menciones por agente (@cursor / @claude)

Puedes enviar en Discord:

- `@cursor <instrucción>` para ejecución en el carril de Cursor.
- `@claude <instrucción>` para carril de Claude/n8n.

El helper detecta target en automático:

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  ./scripts/dispatch-discord-command.sh --content "@claude revisa estado del deploy"
```

## Troubleshooting

- **401/403 GitHub API**: revisar `GITHUB_TOKEN` (o `GITHUB_TOKEN_N8N`) y scope `repo` / Contents.
- **No llega confirmacion a Discord**: revisar `DISCORD_WEBHOOK_URL`.
- **Webhook responde 200 pero no actualiza archivo**: validar obtencion de `sha` actual.
- **Cursor no ejecuta**: verificar `cursor-prompt-monitor` activo y logs en `/opt/opsly/logs/cursor-prompt-monitor.log`.
