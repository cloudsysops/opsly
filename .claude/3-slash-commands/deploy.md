# /deploy — Workflow de Despliegue

Ejecuta el deploy de Opsly. Ver detalles completos en `AGENTS.md` (sección "Infraestructura VPS-dragon") y `docs/runbooks/DEPLOY-GITHUB-ACTIONS.md`.

## Comandos Rápidos

### Opción 1: GitHub Actions (Recomendado)
```bash
gh workflow run deploy.yml --ref main
gh run list --workflow=deploy.yml --limit 3
```

### Opción 2: Manual VPS (Staging)
```bash
ssh vps-dragon@100.120.151.91
cd /opt/opsly && git pull
doppler run --project ops-intcloudsysops --config prd -- ./scripts/vps-bootstrap.sh
docker compose -f infra/docker-compose.platform.yml --env-file /opt/opsly/.env pull
docker compose -f infra/docker-compose.platform.yml --env-file /opt/opsly/.env up -d --no-deps app admin portal
```

### Verificación
```bash
# Health check (hasta 5 intentos)
for i in {1..5}; do
  curl -sfk "https://api.ops.smiletripcare.com/api/health" && break
  sleep 15
done

# Ver servicios
ssh vps-dragon@100.120.151.91 "docker ps --format '{{.Names}}\t{{.Status}}'"
```

## Pre-requisitos
- [ ] `./scripts/validate-config.sh` → LISTO PARA DEPLOY
- [ ] `npm run type-check` → 0 errores
- [ ] Cloudflare Proxy ON
- [ ] SSH vía Tailscale (`100.120.151.91`)

## Referencias
- `AGENTS.md` → "Infraestructura VPS-dragon", "Deploy staging"
- `.github/workflows/deploy.yml` — pipeline GitHub Actions
- `docs/runbooks/DEPLOY-GITHUB-ACTIONS.md` — runbook completo
- `infra/docker-compose.platform.yml` — definición servicios
