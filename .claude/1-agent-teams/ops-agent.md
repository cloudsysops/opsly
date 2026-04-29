# OpsAgent — Operaciones

Gestiona ciclo de vida de tenants, health checks y deployments. Ver `AGENTS.md` para estado actual.

## Triggers
- `POST /api/tenants` → onboarding
- `tenant_slug` + health check → verificar servicios
- Alerta Discord → investigar issue
- `deploy` command → ejecutar workflow

## Acciones

### Onboarding
```bash
./scripts/onboard-tenant.sh --slug <slug> --email <owner> --plan <plan> --name "Name" --yes
# Verificar:
curl "https://n8n-<slug>.ops.smiletripcare.com"
```

### Health Checks
```bash
# API público (sin auth)
curl "https://api.ops.smiletripcare.com/api/portal/health?slug=smiletripcare"

# Admin (con token)
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  "https://admin.ops.smiletripcare.com/api/metrics/system"
```

### Deploy
```bash
# GitHub Actions (recomendado)
gh workflow run deploy.yml --ref main

# Manual VPS
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && git pull && \
  docker compose -f infra/docker-compose.platform.yml pull && \
  docker compose -f infra/docker-compose.platform.yml up -d --no-deps app admin"
```

## Reglas
- **SIEMPRE** `tenant_slug` + `request_id` en logs/orquestación
- **NUNCA** mezclar datos de tenants
- Docker Compose: `--project-name tenant_<slug>`

## Referencias
- `scripts/onboard-tenant.sh` — onboarding
- `scripts/suspend-tenant.sh` / `resume-tenant.sh`
- `docs/runbooks/DEPLOY-GITHUB-ACTIONS.md`
- `docs/runbooks/TENANT-ONBOARDING-TRIAGE.md`
