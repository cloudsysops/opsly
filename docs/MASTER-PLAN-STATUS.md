# MASTER PLAN — Estado actual
## Última actualización: 2026-04-10 (Sprint 3 ✅ | Sprint 4 en progreso)
## FASE ACTUAL: Sprint 4 — Self-Healing Orchestrator + Context Persistence + CVE Scanning

## Progreso por sprints enterprise

| Sprint | Nombre | Estado | Commit | Tests |
|--------|--------|--------|--------|-------|
| Sprint 1 | Stripe Checkout + Landing + CF Hardening | ✅ Completo | `feat(sprint1)` | 241 ✅ |
| Sprint 2 | Backups SHA256 + Health Monitor + Audit Trail | ✅ Completo | `feat(sprint2)` | 241 ✅ |
| Sprint 3 | Usage Billing Sync + Plan Upgrade + AI Cost Caps | ✅ Completo | `2644a03` | 241 ✅ |
| Sprint 4 | Self-Healing Orchestrator + Context Persistence + CVE | 🔄 En progreso | — | — |
| Sprint 5 | Multi-tenant RBAC + API Rate Limiting + SLO Dashboard | ⏳ Pendiente | — | — |
| Sprint 6 | Fine-tuning pipeline + Vector RAG | ⏳ Pendiente | — | — |
| Sprint 7 | Multi-región + Disaster Recovery | ⏳ Pendiente | — | — |
| Sprint 8 | GA Release + Onboarding Self-serve | ⏳ Pendiente | — | — |

## Progreso por fases producto (histórico)
| Fase | Nombre | Estado | Commit |
|------|--------|--------|--------|
| 1 | Infraestructura base | ✅ Completa | — |
| 2 | Portal + invitaciones | ✅ Completa | — |
| 3 | OpenClaw MCP | ✅ Completa | — |
| 4 | LLM Gateway Beast Mode | ✅ Completa | — |
| 5 | Feedback + ML | ✅ Completa | — |
| 6 | OAuth 2.0 + PKCE | ✅ Completa | — |
| 7 | Skills Claude Supremo | ✅ Completa | — |
| 8 | Sprint nocturno | ✅ Completa | `c5cac32` |
| 9 | Activación producción | ✅ Completa (operativa) | `dbb28c9` |
| 10 | Google Cloud + BigQuery | 🔄 En progreso | — |
| 11 | Fine-tuning + Agentes | ⏳ Pendiente | — |
| 12 | Monetización | ⏳ Pendiente | — |

## Próximo paso inmediato (Sprint 4)

### Sprint 4 — Self-Healing + Context Persistence + CVE
```bash
# 1) Self-healing orchestrator (circuit breaker + RetryPolicy)
# apps/orchestrator/src/resilience/circuit-breaker.ts
# apps/orchestrator/src/resilience/retry-policy.ts
# apps/orchestrator/src/monitoring/worker-health-monitor.ts

# 2) Context persistence (cross-session agent state)
# supabase/migrations/0019_agent_sessions.sql
# apps/context-builder/src/persistence/ (save/restore)

# 3) CVE scanning workflow
# .github/workflows/security.yml (npm audit + docker scout)
```

### LocalRank / Drive (bloqueantes humanos)
```bash
# SSH solo por Tailscale:
ssh vps-dragon@100.120.151.91 "echo ok"

# Onboard tenant
./scripts/onboard-tenant.sh --slug localrank --email jkbotero78@gmail.com \
  --plan startup --name "LocalRank" --ssh-host 100.120.151.91 --yes
```

## Hecho recientemente (Sprints 1–3)

### Sprint 3 (2026-04-10) — Usage Billing + Plan Upgrade + AI Cost Caps ✅
- **Usage sync:** `syncAllTenantsUsage(deps?: SyncDeps)` — DI pattern, no vi.mock
  - `apps/api/lib/stripe/usage-sync.ts` + test completo `usage-sync.test.ts` (5/5)
  - Cron `GET /api/cron/sync-stripe-usage` protegido por `CRON_SECRET`
- **Plan upgrade:** `POST /api/portal/tenant/[slug]/subscription/upgrade`
  - Zero-Trust: `resolveTrustedPortalSession` + `tenantSlugMatchesSession`
  - Stripe `subscriptions.update()` + `updateTenantPlan()` en Supabase
- **AI cost caps:** `platform.tenant_budgets` + `GET/PUT /api/portal/tenant/[slug]/budget`
  - 429 cuando `monthly_cap_usd` excedido; alerta en `alert_threshold_pct` (80%)
- **Migraciones:** `0017_tenant_budgets.sql`, `0018_subscriptions_invoice_tracking.sql`
- **ADR-015:** Patrón DI sobre vi.mock para módulos con singletons de cliente

### Sprint 2 (2026-04-09) — Backups SHA256 + Health Monitor + Audit Trail ✅
- `scripts/backup-tenants.sh` con SHA256 + upload S3; `scripts/restore-tenant.sh`
- `GET /api/admin/health-monitor` — polling tenants + BullMQ queue depth
- `platform.audit_log` + `POST /api/admin/audit` con admin token

### Sprint 1 (2026-04-08) — Stripe Checkout + Landing + CF Hardening ✅
- Stripe Checkout `POST /api/checkout/session` + webhook `checkout.session.completed`
- Landing page `/` con planes startup/business/enterprise + CTA
- Cloudflare hardening: `scripts/vps-secure.sh`, UFW + Tailscale SSH-only

## Bloqueantes activos

### Técnicos (no bloqueantes de sprint)
- **Drive 403** hasta compartir carpeta con service account (acción humana en Google Drive)
- `GOOGLE_CLOUD_PROJECT_ID`, `BIGQUERY_DATASET`, `VERTEX_AI_REGION` pendientes en Doppler `prd`

### Operativos (requieren acceso manual)
- **SSH VPS inestable** — usar siempre `ssh vps-dragon@100.120.151.91` (Tailscale)
- **Cloudflare Proxy** — habilitar Proxy ON para `*.ops.smiletripcare.com`
- **Resend dominio** — verificar dominio para envío fuera de cuenta prueba
- **LocalRank** — onboarding pendiente tras SSH estable

## Métricas del proyecto
- **Tests:** API 241/241 | MCP 26/26 | LLM Gateway 17/17 | Orchestrator 8/8 | ML 4/4 | Portal 23/23
- **Type-check:** 11/11 workspaces ✅
- **OpenAPI paths:** 21 validados (validate-openapi ✅)
- **ADRs:** 14 documentadas (`docs/adr/`)
- **Migraciones SQL:** 18 (`supabase/migrations/`)
- **Scripts operativos:** 38 (`scripts/`)
- **Tenants activos en staging:** smiletripcare ✅ | localrank ⏳

