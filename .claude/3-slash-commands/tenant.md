# /tenant — Crear/Depurar Tenant

Gestiona tenants de prueba. Ver `AGENTS.md` (sección "Primer tenant en staging — smiletripcare") y `docs/runbooks/TENANT-ONBOARDING-TRIAGE.md`.

## Crear Tenant
```bash
./scripts/onboard-tenant.sh --slug <slug> --email <owner> --plan <startup|business|enterprise> --name "Name" --yes
```

## Verificar
```bash
# Supabase
doppler run --project ops-intcloudsysops --config prd -- \
  npx supabase db query "SELECT slug, plan, status FROM platform.tenants WHERE slug='testtenant';"

# Servicios Docker
docker ps --format '{{.Names}}' | grep "tenant_testtenant"

# URLs
echo "n8n: https://n8n-testtenant.ops.smiletripcare.com"
echo "uptime: https://uptime-testtenant.ops.smiletripcare.com"

# Health
curl -sf "https://api.ops.smiletripcare.com/api/portal/health?slug=testtenant"
```

## Debug
```bash
docker logs tenant_testtenant_n8n_1 --tail 100
docker network inspect tenant_testtenant_default
```

## Suspender/Reanudar
```bash
./scripts/suspend-tenant.sh <slug>
./scripts/resume-tenant.sh <slug>
```

## Invitar Usuario
```bash
curl -X POST "https://api.ops.smiletripcare.com/api/invitations" \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "slug": "testtenant", "name": "Test", "mode": "developer"}'
```

## Referencias
- `AGENTS.md` → "Primer tenant en staging", "LocalRank por Tailscale"
- `scripts/onboard-tenant.sh` — script principal
- `docs/runbooks/TENANT-ONBOARDING-TRIAGE.md` — troubleshooting
- `infra/templates/` — plantilla Docker Compose
