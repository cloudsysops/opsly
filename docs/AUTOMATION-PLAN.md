# Plan de Automatizacion Opsly
## Version: 1.0 | Fecha: 2026-04-07 | Estado: EN PROGRESO

## El flujo objetivo

```
┌─────────────────────────────────────────────────────┐
│  CRISTIAN (desde cualquier lugar)                   │
│  Escribe en Discord #opsly-tareas:                  │
│  "Agregar campo X al portal de clientes"            │
└──────────────────┬──────────────────────────────────┘
                   │ Discord webhook
                   ▼
┌─────────────────────────────────────────────────────┐
│  n8n (tenant intcloudsysops)                        │
│  Workflow: Discord → GitHub                         │
│  1. Recibe mensaje                                  │
│  2. Valida formato (no vacio, no spam)              │
│  3. Escribe docs/ACTIVE-PROMPT.md via GitHub API    │
│  4. Confirma en Discord: "📝 Tarea recibida"        │
└──────────────────┬──────────────────────────────────┘
                   │ git push a main
                   ▼
┌─────────────────────────────────────────────────────┐
│  cursor-prompt-monitor.sh (VPS, cada 30s)           │
│  Detecta cambio en ACTIVE-PROMPT.md                 │
│  Notifica Discord: "🤖 Ejecutando tarea..."         │
│  Ejecuta el contenido como shell                    │
└──────────────────┬──────────────────────────────────┘
                   │ ejecucion completa
                   ▼
┌─────────────────────────────────────────────────────┐
│  post-commit hook (.githooks/post-commit)           │
│  → notify-discord.sh "✅ Tarea completada"          │
│  → drive-sync.sh (AGENTS.md + docs a Drive)         │
│  → update-state.js (system_state.json)              │
└──────────────────┬──────────────────────────────────┘
                   │ Drive actualizado
                   ▼
┌─────────────────────────────────────────────────────┐
│  Claude (proxima sesion)                            │
│  google_drive_search → lee AGENTS.md                │
│  Contexto completo sin copiar/pegar nada            │
└─────────────────────────────────────────────────────┘
```

## Componentes a construir

| # | Componente | Archivo | Prioridad | Tests |
|---|-----------|---------|-----------|-------|
| 1 | Discord notifier | `scripts/notify-discord.sh` | Alta | `scripts/test-notify-discord.sh` |
| 2 | Drive sync | `scripts/drive-sync.sh` | Alta | `scripts/test-drive-sync.sh` |
| 3 | post-commit mejorado | `.githooks/post-commit` | Alta | manual |
| 4 | cursor-prompt-monitor + Discord | `scripts/cursor-prompt-monitor.sh` | Media | manual |
| 5 | n8n workflow Discord→GitHub | export JSON + docs | Media | `scripts/test-n8n-webhook.sh` |
| 6 | GitHub PAT para n8n | Doppler `GITHUB_TOKEN_N8N` | Media | n/a |
| 7 | Google Drive token | Doppler `GOOGLE_DRIVE_TOKEN` | Baja | `scripts/test-drive-sync.sh` |
| 8 | MCP server Opsly | `apps/mcp/` | Futura | vitest |

## Variables requeridas en Doppler prd

| Variable | Proposito | Como obtener |
|----------|-----------|--------------|
| DISCORD_WEBHOOK_URL | Notificaciones | Discord -> Integraciones -> Webhooks |
| GITHUB_TOKEN_N8N | n8n escribe en repo | GitHub -> Settings -> Tokens (`repo`) |
| GOOGLE_DRIVE_TOKEN | Subir docs a Drive | Google Cloud -> Service Account -> JSON key/token |

## Restricciones de seguridad

- Nunca hardcodear tokens en scripts.
- Nunca hacer echo de secretos completos.
- `cursor-prompt-monitor` solo ejecuta lineas no comentadas (`#`, `---`).
- El webhook n8n debe validar header secreto antes de procesar.
- `GOOGLE_DRIVE_TOKEN` debe tener permisos minimos sobre carpeta Opsly.

## Criterios de exito

- [ ] Cristian escribe en Discord -> Cursor ejecuta -> Discord confirma.
- [ ] AGENTS.md en Drive actualizado tras cada commit.
- [ ] Claude lee Drive en chat nuevo sin pegar contexto.
- [ ] Cero intervencion manual de Cristian en el flujo.
