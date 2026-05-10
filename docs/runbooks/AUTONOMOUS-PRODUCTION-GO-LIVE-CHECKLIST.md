# Checklist único — Go-live autonomía Opsly (staging → producción)

**Ámbito:** promoción segura de capacidades autónomas según el plan de 60 días.  
**No sustituye:** `AGENTS.md`, `docs/runbooks/PRODUCTION-SECURITY-BASELINE.md`, ni checklists por tenant (p. ej. LegalVial).

## Antes de abrir tráfico o ampliar autonomía

### A. Gates técnicos (obligatorios)

| # | Criterio | Cómo verificar |
|---|----------|----------------|
| 1 | OpenAPI subset CI | `npm run validate-openapi` |
| 2 | Type-check núcleo | `npm run type-check` o `bash scripts/ci/release-gate.sh staging` |
| 3 | Tests api + orchestrator + portal | Incluidos en `scripts/ci/release-gate.sh` |
| 4 | Smoke invite (dry-run) | `bash scripts/test-e2e-invite-flow.sh --dry-run` (ajustar `API_URL` / `TENANT_REF`) |

**En CI:** el workflow **Deploy** ejecuta `release-gate` antes de build/deploy cuando no se usa `skip_tests` (ver `.github/workflows/deploy.yml`).

### B. Operación y seguridad

| # | Criterio | Referencia |
|---|----------|------------|
| 5 | SSH admin solo Tailscale; UFW/Cloudflare alineados | `docs/runbooks/PRODUCTION-SECURITY-BASELINE.md` |
| 6 | Secretos solo Doppler; sin placeholders críticos | `./scripts/validate-config.sh` |
| 7 | Redis / colas BullMQ estables | `docs/ORCHESTRATOR.md`, health orchestrator |

### C. Autonomía y riesgo

| # | Criterio | Referencia |
|---|----------|------------|
| 8 | Políticas por tipo de job entendidas | [`AUTONOMY-JOB-POLICY-MAP.md`](./AUTONOMY-JOB-POLICY-MAP.md) |
| 9 | Go/No-Go semanal si se expande alcance | [`../plans/AUTONOMY-GO-NO-GO-WEEKLY.md`](../plans/AUTONOMY-GO-NO-GO-WEEKLY.md) |
|10 | KPIs visibles (SLO, costo, éxito, MTTR) | [`AUTONOMOUS-OPERATIONS-DASHBOARD.md`](./AUTONOMOUS-OPERATIONS-DASHBOARD.md) |

### D. Multi-tenant y promoción

| # | Criterio | Comando / workflow |
|---|----------|---------------------|
|11 | Readiness tenant (health, URLs, invite dry-run) | `bash scripts/tenant/onboarding-readiness.sh --tenant-slug <slug>` |
|12 | Canary + rollback definidos | `bash scripts/deploy/promote-canary.sh --help` · `.github/workflows/promote-production-canary.yml` |

### E. Post go-live

| # | Acción |
|---|--------|
|13 | Registrar fecha, SHA desplegado y responsable |
|14 | Primera hora: revisar logs JSON workers (`autonomy_risk`, `request_id`, `tenant_slug`) |
|15 | Incidentes autónomos: [`INCIDENT-AUTONOMOUS-AGENT.md`](./INCIDENT-AUTONOMOUS-AGENT.md) |

## Documentos relacionados

- Resumen 60 días: [`AUTONOMOUS-PROD-60D.md`](./AUTONOMOUS-PROD-60D.md)
- Deploy Actions: [`DEPLOY-GITHUB-ACTIONS.md`](./DEPLOY-GITHUB-ACTIONS.md)
