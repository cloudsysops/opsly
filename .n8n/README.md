# .n8n/ — Configuración de n8n Agents para Opsly

Estructura para gestionar workflows n8n autónomos en Opsly (plataforma multi-tenant).

## Estructura

```
.n8n/
├── README.md                    # Este archivo
├── setup.sh                    # Script de instalación automática
├── 1-workflows/              # Workflows n8n (JSON templates)
│   ├── discord-to-github.json  # Discord → GitHub ACTIVE-PROMPT
│   ├── backup-workflow.json    # Backup automático
│   └── tenant-onboard.json    # Onboarding workflow
├── 2-context/                # Contexto para n8n agents
│   ├── AGENTS.md            # Estado operativo (espejo de raíz)
│   └── system_state.json     # Estado del sistema (espejo)
├── 3-webhooks/               # Webhooks endpoints
│   ├── discord-webhook.md    # Configuración Discord
│   └── github-webhook.md    # Configuración GitHub
├── 4-triggers/               # Disparadores automáticos
│   ├── cron-jobs.json       # Trabajos programados
│   └── event-triggers.json  # Disparadores por evento
└── n8n-import.sh             # Script para importar workflows
```

## Uso Rápido

### 1. Instalación inicial

```bash
# Clonar repo y entrar
cd /opt/opsly

# Dar permisos de ejecución
chmod +x .n8n/n8n-import.sh .n8n/setup.sh

# Ejecutar setup automático
./.n8n/setup.sh
```

### 2. Importar Workflows a n8n

```bash
# Importar el workflow más reciente
./.n8n/n8n-import.sh

# Importar manualmente (requiere n8n CLI)
n8n import:workflow --input=.n8n/1-workflows/discord-to-github.json
```

### 3. Configurar Webhooks

Los webhooks n8n se configuran automáticamente en los tenants vía `scripts/onboard-tenant.sh`.

**URL base:** `https://n8n-<slug>.ops.smiletripcare.com`

### 4. Workflows Disponibles

| Workflow | Propósito | Trigger |
|----------|-----------|---------|
| discord-to-github | Discord → GitHub ACTIVE-PROMPT | `POST /webhook/opsly-discord-task` |
| backup-workflow | Backup automático diario | Cron: `0 2 * * *` |
| tenant-onboard | Onboarding automático | API call / evento |

## Integración con Claude Code

Los workflows n8n comparten contexto con Claude vía:
- **`2-context/AGENTS.md`** — espejo de `/opt/opsly/AGENTS.md`
- **`2-context/system_state.json`** — espejo de `/opt/opsly/context/system_state.json`

Actualización automática vía `.githooks/post-commit` + `scripts/sync-n8n-context.sh`.

## Variables de Entorno (Placeholders)

**NUNCA** commitear secretos. Usar Doppler:

```bash
# n8n requiere estas vars en Doppler `prd`:
# N8N_WEBHOOK_URL=<url>
# N8N_WEBHOOK_SECRET_GH=<secret>
# GITHUB_TOKEN_N8N=<pat>
```

## Comandos Útiles

```bash
# Ver workflows en n8n
curl -s https://n8n-smiletripcare.ops.smiletripcare.com/api/v1/workflows

# Ejecutar workflow manualmente
curl -X POST https://n8n-smiletripcare.ops.smiletripcare.com/webhook/opsly-discord-task \
  -H "Content-Type: application/json" \
  -d '{"content": "# Test desde Claude", "author": {"username": "Claude"}}'

# Ver logs de n8n
docker logs tenant_smiletripcare_n8n_1 --tail 100
```

## Referencias Cruzadas

- **Estado operativo**: `AGENTS.md` (raíz del repo)
- **Workflows docs**: `docs/n8n-workflows/`
- **Discord webhook**: `docs/n8n-workflows/discord-to-github.json`
- **n8n import script**: `scripts/n8n-import.sh`
- **Onboarding**: `scripts/onboard-tenant.sh`
- **n8n template**: `infra/templates/n8n-workflows-template.md`

## Troubleshooting

### n8n no responde
```bash
# Verificar contenedor
docker ps | grep n8n

# Ver logs
docker logs tenant_<slug>_n8n_1 --tail 50

# Reiniciar
docker restart tenant_<slug>_n8n_1
```

### Webhook devuelve 404
```bash
# Verificar que el workflow está activo en n8n
curl -s https://n8n-<slug>.ops.smiletripcare.com/api/v1/workflows | jq '.data[] | select(.name=="...") | .active'

# Activar si está inactivo
curl -X POST https://n8n-<slug>.ops.smiletripcare.com/api/v1/workflows/<id>/activate
```

### n8n CLI no encontrado
```bash
# Instalar n8n CLI globalmente
npm install -g n8n

# Verificar
n8n --version
```
