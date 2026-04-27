# Opsly Infra Skill

> **Triggers:** `docker`, `compose`, `deploy`, `vps`, `ssh`, `traefik`, `script`, `bash`, `shell`, `dockerfile`, `healthcheck`, `memory`, `infra`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-tenant`, `opsly-discord`, `opsly-bootstrap`

## Cuándo usar

Al trabajar con infraestructura: Docker/Compose, VPS, deploy, Traefik, scripts bash, monitoreo, o cualquier operación de infra en `/opt/opsly` o `infra/`.

## Scripts bash — Plantilla obligatoria

Todo script nuevo en `scripts/` debe seguir esta plantilla:

```bash
#!/usr/bin/env bash
# nombre-script.sh — descripción en una línea
# Uso: ./scripts/nombre-script.sh [--dry-run] [--skip-X]
#
# Variables requeridas (Doppler prd o export):
#   VAR_REQUERIDA — para qué sirve

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO  $*"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN  $*" >&2; }
die()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR $*" >&2; exit 1; }

main() {
  if $DRY_RUN; then
    log "DRY-RUN: pasos que se ejecutarían"
    return 0
  fi
  # ejecución real
}

main "$@"
```

## Docker Compose — Patrones

### YAML Anchors

Usar anchors para configuración repetida entre servicios:

```yaml
x-healthcheck-node: &healthcheck-node
  interval: 30s
  timeout: 10s
  retries: 3

x-env-supabase: &env-supabase
  SUPABASE_URL: ${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}
  NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:-}
  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-}
```

### Dockerfile multi-stage

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build -w @intcloudsysops/service-name

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/service-name/dist ./apps/service-name/dist
CMD ["node", "dist/src/server.js"]
```

### Memory limits

Todos los servicios **deben** tener `deploy.resources.limits.memory`. Valores típicos:

| Servicio | Memory | Servicio     | Memory |
| -------- | ------ | ------------ | ------ |
| api      | 768M   | llm-gateway  | 1G     |
| admin    | 512M   | orchestrator | 1G     |
| portal   | 512M   | hermes       | 512M   |
| mcp      | 256M   | redis        | 384M   |
| traefik  | 256M   | n8n          | 512M   |

## VPS — Operaciones

```bash
# Acceso — SIEMPRE Tailscale
ssh vps-dragon@100.120.151.91

# Logs de un servicio
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && docker compose -f infra/docker-compose.platform.yml logs --tail=50 api"

# Restart de un servicio
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && docker compose -f infra/docker-compose.platform.yml restart api"

# Estado de disco
ssh vps-dragon@100.120.151.91 "df -h / && docker system df"
```

## Deploy — Flujo

1. Push a `main` en GitHub
2. GitHub Actions build + push a GHCR
3. VPS pull + restart vía workflow o manual:
   ```bash
   ssh vps-dragon@100.120.151.91 "cd /opt/opsly && git pull && docker compose -f infra/docker-compose.platform.yml up -d --pull always"
   ```
4. Verificar health: `curl -sf https://api.ops.smiletripcare.com/api/health`
5. Notificar Discord: `./scripts/notify-discord.sh "Deploy" "Servicio X actualizado" "success"`

## Reglas

- `set -euo pipefail` en todo script.
- `--dry-run` cuando el script modifique infra o datos.
- Nunca secretos en código — usar Doppler.
- Nunca `docker system prune --volumes` sin runbook.
- Siempre validar compose: `docker-compose config > /dev/null`.
- No crear YAML anchors para configuración que aparece una sola vez.
- SSH solo por Tailscale — nunca IP pública directa.

## Errores comunes

| Error            | Causa                          | Solución                                     |
| ---------------- | ------------------------------ | -------------------------------------------- |
| Invalid YAML     | Anchor mal formado             | `docker-compose config` para validar         |
| OOM killed       | Sin memory limit               | Agregar `deploy.resources.limits.memory`     |
| SSH timeout      | IP pública en vez de Tailscale | Usar `100.120.151.91`                        |
| pipefail exit    | Comando falla sin set -e       | `set -euo pipefail` siempre                  |
| secrets leaked   | echo de variable sensible      | Usar `log` sin valores, Doppler para secrets |
| Multi-stage roto | Runner sin artifacts           | Copiar `node_modules` desde builder          |
