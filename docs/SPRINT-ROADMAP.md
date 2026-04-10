# Opsly Enterprise — Sprint Roadmap

> Fuente de verdad para el progreso de sprints enterprise.  
> Para el roadmap de fases de producto, ver `docs/MASTER-PLAN-STATUS.md`.  
> Para decisiones de arquitectura, ver `docs/adr/`.

---

## Visión por sprint

Cada sprint dura ~2–3 días de trabajo intenso. El criterio de salida es:
`type-check 11/11 ✅ | tests ≥241 ✅ | ESLint 0 warnings ✅ | commit firmado`.

---

## Sprint 1 ✅ — Stripe Checkout + Landing + Cloudflare Hardening

**Commit:** `feat(sprint1): ...`  
**Criterio de salida:** Stripe webhook verificado + landing con 3 planes + SSH solo Tailscale

| Entregable | Archivo/Ruta | Estado |
|-----------|--------------|--------|
| Checkout session | `app/api/checkout/session/route.ts` | ✅ |
| Webhook `checkout.session.completed` | `app/api/webhooks/stripe/route.ts` | ✅ |
| Landing page con CTA | `apps/web/app/page.tsx` | ✅ |
| SSH Tailscale-only | `scripts/vps-secure.sh` | ✅ |
| UFW rules | `.github/copilot-instructions.md` | ✅ |

---

## Sprint 2 ✅ — Backups SHA256 + Health Monitor + Audit Trail

**Commit:** `feat(sprint2): ...`  
**Criterio de salida:** Backup idempotente con SHA + audit log inmutable

| Entregable | Archivo/Ruta | Estado |
|-----------|--------------|--------|
| Backup con SHA256 | `scripts/backup-tenants.sh` | ✅ |
| Restore verificado | `scripts/restore-tenant.sh` | ✅ |
| Health monitor API | `app/api/admin/health-monitor/route.ts` | ✅ |
| Audit trail | `platform.audit_log` + `app/api/admin/audit/route.ts` | ✅ |
| Migration | `supabase/migrations/0015_audit_log.sql` | ✅ |

---

## Sprint 3 ✅ — Usage Billing Sync + Plan Upgrade + AI Cost Caps

**Commit:** `2644a03` — 28 files, 241/241 tests  
**Criterio de salida:** Cron Stripe sync + upgrade endpoint + budget 429

| Entregable | Archivo/Ruta | Estado |
|-----------|--------------|--------|
| Stripe usage sync (DI) | `lib/stripe/usage-sync.ts` | ✅ |
| Cron sync endpoint | `app/api/cron/sync-stripe-usage/route.ts` | ✅ |
| Billing summary portal | `app/api/portal/billing/summary/route.ts` | ✅ |
| Plan upgrade | `app/api/portal/tenant/[slug]/subscription/upgrade/route.ts` | ✅ |
| Budget GET/PUT | `app/api/portal/tenant/[slug]/budget/route.ts` | ✅ |
| 429 cost cap middleware | `lib/billing/flush-billing-usage.ts` | ✅ |
| Migration tenant_budgets | `supabase/migrations/0017_tenant_budgets.sql` | ✅ |
| Migration invoice tracking | `supabase/migrations/0018_subscriptions_invoice_tracking.sql` | ✅ |
| ADR-015 DI pattern | `docs/adr/ADR-015-di-pattern-testability.md` | ✅ |

---

## Sprint 4 🔄 — Self-Healing Orchestrator + Context Persistence + CVE Scanning

**Objetivo:** Resiliencia enterprise: circuit breaker en workers BullMQ,
persistencia cross-session del contexto de agentes, y pipeline de seguridad CVE automatizado.

### 4A — Self-Healing Orchestrator

| Entregable | Archivo | Estado |
|-----------|---------|--------|
| Circuit breaker (3 fails→open 60s→half-open) | `apps/orchestrator/src/resilience/circuit-breaker.ts` | ⏳ |
| RetryPolicy (exp backoff + jitter) | `apps/orchestrator/src/resilience/retry-policy.ts` | ⏳ |
| WorkerHealthMonitor | `apps/orchestrator/src/monitoring/worker-health-monitor.ts` | ⏳ |
| LLM provider fallback chain | `apps/llm-gateway/src/fallback-chain.ts` | ⏳ |
| Tests resilience | `apps/orchestrator/src/resilience/__tests__/` | ⏳ |

### 4B — Context Persistence (cross-session)

| Entregable | Archivo | Estado |
|-----------|---------|--------|
| Migration agent_sessions | `supabase/migrations/0019_agent_sessions.sql` | ⏳ |
| Context persist/restore | `apps/context-builder/src/persistence/` | ⏳ |
| TTL por plan (24h/7d/30d) | `apps/context-builder/src/persistence/ttl-policy.ts` | ⏳ |
| Tests context persistence | `apps/context-builder/src/__tests__/` | ⏳ |

### 4C — CVE Scanning

| Entregable | Archivo | Estado |
|-----------|---------|--------|
| Security workflow | `.github/workflows/security.yml` | ⏳ |
| npm audit high severity | (en workflow) | ⏳ |
| docker scout CVE | (en workflow) | ⏳ |
| Discord alert on critical | (en workflow) | ⏳ |

---

## Sprint 5 ⏳ — RBAC Multi-tenant + API Rate Limiting + SLO Dashboard

| Área | Descripción |
|------|-------------|
| RBAC | Roles por tenant: `owner`, `admin`, `viewer`; middleware Zero-Trust |
| Rate limiting | Redis sliding window por tenant/plan (`startup: 100 rpm`, `business: 500 rpm`, `enterprise: unlimited`) |
| SLO Dashboard | Admin panel con latencia p50/p95, uptime 30d, error rate por tenant |
| Alertas | PagerDuty/Discord cuando SLO breach > 5 min |

---

## Sprint 6 ⏳ — Fine-tuning Pipeline + Vector RAG

| Área | Descripción |
|------|-------------|
| Fine-tuning | Export feedback positivo → dataset JSONL → fine-tune Anthropic/OpenAI |
| Vector RAG | `platform.tenant_embeddings` (pgvector) + similarity search en Context Builder |
| Knowledge base por tenant | Upload docs → chunk → embed → store → query |

---

## Sprint 7 ⏳ — Multi-región + Disaster Recovery

| Área | Descripción |
|------|-------------|
| DR plan | RTO < 1h, RPO < 15 min documentado en runbook |
| Backup cross-region | S3 bucket en 2ª región + replicación nightly |
| Failover DNS | Cloudflare Health Checks + fallback IP |
| Chaos test | `scripts/chaos-test.sh` que simula VPS down y mide recuperación |

---

## Sprint 8 ⏳ — GA Release + Onboarding Self-serve

| Área | Descripción |
|------|-------------|
| Self-serve signup | Landing → Stripe Checkout → auto-provisión sin intervención humana |
| Onboarding wizard | Portal `/onboarding` con pasos: dominio, n8n creds, primer workflow |
| Docs públicas | `docs.opsly.io` o `/docs` en web; quickstart, API ref, runbooks |
| SLA Enterprise | Contrato 99.9% + soporte 24h para plan enterprise |

---

## Criterios de salida por sprint (checklist)

```bash
# Antes de marcar sprint como ✅:
npm run type-check          # 11/11 ✅
npm run test -w @intcloudsysops/api   # ≥241 ✅
npm run validate-openapi    # paths completos ✅
npx eslint --max-warnings 0 "apps/api/**/*.ts"  # 0 warnings ✅
git commit -m "feat(sprintN): ..."
```

---

## Cómo SSH al VPS (siempre por Tailscale)

```bash
# ✅ Correcto — usa Tailscale IP
ssh vps-dragon@100.120.151.91

# ❌ Incorrecto — IP pública (bloqueada por UFW)
ssh vps-dragon@157.245.223.7
```

Ver `docs/SSH-COMMANDS-LOCALRANK.md` para comandos de operación.
