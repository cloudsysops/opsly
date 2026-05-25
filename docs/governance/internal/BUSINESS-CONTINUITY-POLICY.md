# Business Continuity & Disaster Recovery Policy

**Version:** 1.0 | **Effective:** 2026-05-25 | **Owner:** Cristian Botero  
**Review:** Annually | **Policy ID:** ops-bcp-v1

---

## 1. Purpose

Define recovery objectives and procedures to restore Opsly services following a disruption.

## 2. Recovery Objectives

| Service | RTO (target) | RPO (target) |
|---------|-------------|-------------|
| Opsly platform (web/portal/api) | 4 hours | 1 hour |
| Supabase database | 4 hours | 15 minutes (PITR) |
| Peskids website | 2 hours | 4 hours |
| VPS services (n8n, Redis, orchestrator) | 8 hours | 24 hours |

## 3. Backup Strategy

### Database (Supabase)
- **PITR (Point-in-Time Recovery):** Enabled on Pro plan — 7-day retention
- **Weekly export:** `supabase db dump` to secure storage
- **Restore test:** Quarterly test restore to staging project

### Code / Configuration
- **GitHub:** Primary source of truth; all code committed and pushed
- **Doppler:** Secrets backed up and versioned; export quarterly to encrypted storage
- **Vercel:** Deployments can be rolled back via dashboard

### VPS Data
- **n8n workflows:** Exported JSON in `docs/n8n/` and `.n8n/` directory
- **Redis:** Non-persistent queue; data loss on failure is acceptable (jobs are idempotent)

## 4. Disaster Recovery Procedures

### 4.1 Supabase database failure
1. Check Supabase status page (status.supabase.com)
2. If Opsly-specific: restore from PITR via Supabase dashboard
3. If Supabase-wide outage: activate maintenance mode; wait for Supabase recovery

### 4.2 Vercel deployment failure
1. Roll back to previous deployment via Vercel dashboard
2. If Vercel-wide: point DNS to static maintenance page via Cloudflare
3. Communicate ETA via status page / Discord

### 4.3 VPS (100.120.151.91) failure
1. Reconnect via Tailscale; SSH into backup access path
2. Restart Docker containers: `docker compose up -d`
3. If hardware failure: spin up new Hetzner VPS; restore Docker volumes from backup
4. Update Tailscale + DNS records

### 4.4 Doppler secrets unavailable
1. Use emergency secrets kit (sealed, stored offline — location known only to founder)
2. Do NOT hardcode secrets in code or environment files

## 5. Communication Plan

| Stakeholder | Channel | Trigger |
|-------------|---------|---------|
| Customers (Opsly) | In-app banner + email | P0/P1 affecting customer data |
| Peskids families | WhatsApp (manual) | Site down > 2 hours |
| Internal (Cristian) | Discord #ops-alerts + PagerDuty | Any P0/P1 alert |

## 6. Annual BCP Test

Each year: simulate a database restore from backup and document results in a post-mortem format.
