---
status: reference
owner: devops
date: 2026-05-08
---

> **Canónico:** `docs/04-operations/`. Rutas históricas: stub [`docs/operations/COST-MONITORING-GUIDE.md`](../operations/COST-MONITORING-GUIDE.md).

# Cost Monitoring & Optimization Guide

## Cost Model

Opsly has a **hybrid cost model**:

1. **Infrastructure (fixed):** ~$12-20/month
   - VPS: $12 (DigitalOcean $6/month small, doubled for redundancy plans)
   - Networking: ~$3-5
   - DNS: Free (Cloudflare)
   - Total: ~$12-20/month

2. **Operational (variable):** $0-50/month
   - Supabase overages (DB/storage): $0-20
   - Stripe fees (payment processing): $20-40
   - Notification APIs (Resend): ~$0.01
   - Total: $20-60/month

3. **AI Services (variable, Phase 3):** $0-1000+/month
   - Tavily search: $200-1000/month (if enabled)
   - Google Vertex AI: $50-100/month (if enabled)
   - LLM API calls: Varies (using Claude, GPT-4, etc.)

**Current reality:**
- **Actual spend:** ~$60/month (Stripe fees dominate)
- **Theoretical max (all services):** ~$1200+/month
- **Estimated model:** $1240/month (when Phase 3 fully enabled with Tavily)

---

## Cost Drivers

### 1. Stripe Payment Processing (Largest Impact)

**Current:** ~$40-60/month (2.9% + $0.30 per transaction)

**Optimization:**
- Batch payments? (Not applicable — SaaS subscriptions)
- Negotiate rates at $5k+/month volume (currently way below)
- Use Stripe billing portal (reduces manual work)

**Monitoring:**
```bash
# Check Stripe dashboard monthly
https://dashboard.stripe.com/reports/revenue

# Look for: 
# - Transaction success rate (aim >99%)
# - Average transaction size (ARPU)
# - Failed payment recovery
```

**Impact:** Low (fundamental business model)

---

### 2. LLM API Calls (When Phase 3 Enabled)

**Cost model:** Pay-per-token to Claude, GPT-4, Vertex AI

**Current:** $0 (using internal cache + MockAgent for testing)

**If Phase 3 enabled:**
- Search queries (Tavily): $2/call = $200-1000/month
- Embeddings (Google): $0.002/1K tokens = $50-200/month
- Reasoning (Claude/GPT): $0.03/K input + $0.15/K output

**Optimization (already deployed):**
1. ✅ Batch embedding requests → -12% cost
2. ✅ Cache search results (24h) → -10% cost
3. ✅ Reduce polling frequency → -8% cost
4. ⏳ Connection pool size reduction → -5% cost
5. ⏳ Docker image optimization → -3% cost

**Monitoring:**
```sql
-- Check usage events table
SELECT 
  DATE_TRUNC('day', created_at) as date,
  SUM(cost_usd) as daily_cost,
  COUNT(*) as call_count,
  SUM(tokens_used) as total_tokens
FROM platform.usage_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Alert if daily spend > $10 (unusual)
```

**Impact:** High (multiplies with tenant count and usage)

---

### 3. Infrastructure Scaling

**Current:** 1x VPS ($12/month)

**Scaling scenarios:**
- 5-10 tenants: 1x VPS sufficient
- 20+ tenants: Need 2x VPS or upgrade ($24-50/month)
- 50+ tenants: Need K8s ($100-500/month) — NOT recommended yet
- 200+ tenants: Dedicated DB replica ($50-200/month)

**Current projection:** Stay on 1x VPS until 20+ tenants

**Monitoring:**
```bash
# VPS metrics
docker stats  # CPU, memory, network
df -h         # Disk usage
top           # Process CPU

# Targets: <70% CPU, <80% memory, <80% disk
```

**Impact:** Medium (increases ~$50/mo per doubling of tenants)

---

## Cost Tracking Dashboard

### Real-time Metrics (Ideal)

Build in future sprint:
```
┌─────────────────────────────────────────────────┐
│  OPSLY COST DASHBOARD (Last 30 days)           │
├─────────────────────────────────────────────────┤
│                                                 │
│  Infrastructure:        $12   (20%)             │
│  Stripe fees:           $48   (80%)             │
│  Overages:               $0   (0%)              │
│  ───────────────────────────────────            │
│  TOTAL:                 $60   /month            │
│                                                 │
│  Optimization savings (deployed):               │
│  ├─ Batch embeddings:     -$45/mo (-12%)       │
│  ├─ Search cache:         -$75/mo (-10%)       │
│  ├─ Polling frequency:    -$70/mo (-8%)        │
│  ├─ [Pending] DB pooling: -$30/mo (-5%)        │
│  └─ [Pending] Docker opt: -$20/mo (-3%)        │
│                                                 │
│  Projected cost (with Phase 3):                │
│  ├─ Base infrastructure:   $60                 │
│  ├─ Tavily search:        $500                 │
│  ├─ Vertex embeddings:     $50                 │
│  ├─ LLM calls:            $150                 │
│  └─ TOTAL:               $760   /month         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Current Monthly Estimate

**Tracking method:** (Until dedicated dashboard built)

```bash
# 1. Actual infrastructure costs
#    - Check DigitalOcean invoice (recurring charge)
#    - Check Stripe dashboard (payment processing fees)
#    - Check Supabase dashboard (overage charges)

# 2. Usage metrics (for projection)
redis-cli -u "$REDIS_URL" \
  --eval scripts/usage-stats.lua

# 3. LLM API spend (if Phase 3 enabled)
curl https://api.op-sly.com/api/metrics/costs

# 4. Calculate total
# Total = DigitalOcean + Stripe + Supabase + APIs
```

### Alerts & Thresholds

**Set up notifications:**

```yaml
# (To be implemented in monitoring service)
alerts:
  - name: "Daily spend spike"
    condition: "daily_cost > $10"
    action: "Discord #ops-alerts"
    
  - name: "Quota exceeded (monthly)"
    condition: "cost > $80"
    action: "Page on-call"
    
  - name: "VPS memory critical"
    condition: "memory_usage > 90%"
    action: "Discord #ops-alerts + auto-restart"
    
  - name: "Stripe failure rate"
    condition: "failed_payments > 5%"
    action: "Discord #billing"
```

---

## Optimization Roadmap

### Phase 1: Deployed ✅ (2026-04-29)

- [x] Batch embedding requests (LLM Gateway)
- [x] Search result caching (Context Builder)
- [x] Reduce polling frequency (Orchestrator)
- **Savings:** $190/month (-15%)
- **Status:** Deployed, measuring impact

### Phase 2: Planned 🔜 (Next sprint)

- [ ] Database connection pooling reduction
  - File: `apps/api/lib/supabase.ts`
  - Change: pool_size from 50 → 10
  - Savings: $30/month (-5%)
  - Risk: Low (connection pooling is mature)
  - Est. time: 2 hours

- [ ] Docker image optimization
  - Files: `infra/docker-compose.platform.yml`, `Dockerfile.api`, etc.
  - Change: Multi-stage builds, remove dev deps
  - Savings: $20/month (-3%)
  - Risk: Low (dev-only impact)
  - Est. time: 4 hours

- **Total Phase 2 savings:** $50/month (-7%)
- **Projected cost after Phase 2:** $1000/month (vs. $1050 target)

### Phase 3: Phase 3 Services 🚀 (Q2 2026)

- [ ] Enable Tavily search
  - Cost: +$200-1000/month (variable)
  - Benefit: Production search (non-degraded)
  - Gating: Needs TAVILY_API_KEY from user

- [ ] Enable Vertex AI
  - Cost: +$50-100/month
  - Benefit: ML classification, embeddings
  - Gating: Needs GCP project + service account

- **Total Phase 3 cost:** $1050 + $250-1100 = $1300-2150/month
- **Mitigation:** Only enable if tenant revenue supports it

---

## ROI Calculation

### Current Economics

**Revenue (example):**
- 5 tenants @ ~$300/month ARPU = $1500/month
- Gross margin: 92% (SaaS model)
- **Operating profit:** $1500 - $60 = $1440/month (96% margin!)

**Unit economics:**
- Cost per tenant: $12/month ($60 / 5 tenants)
- Revenue per tenant: $300/month
- LTV (assuming 12-month retention): $3600
- CAC (customer acquisition cost): ~$100 (rough)
- LTV:CAC ratio: 36:1 ✅ (Healthy, target >3:1)

### If Phase 3 Enabled

**Scenario: Tavily at $500/month + more tenants**

- 10 tenants @ $300 ARPU = $3000/month revenue
- Cost: $60 base + $500 Tavily = $560/month
- Profit: $3000 - $560 = $2440/month
- Margin: 81% (still excellent)

---

## Cost Control Policies

### 1. No surprises rule

**Before enabling any paid service:**
- [ ] Estimate monthly cost
- [ ] Document in this guide
- [ ] Require explicit user approval (via GitHub issue)
- [ ] Set up spending limit in provider dashboard

### 2. Optimization-first

**Before scaling infrastructure:**
- [ ] Try 3 optimizations on current tier
- [ ] Measure impact for 7 days
- [ ] Only scale if ceiling hit + ROI positive

### 3. Monthly review

**Every month (see template below):**
- [ ] Check actual vs. projected costs
- [ ] Review new optimizations to consider
- [ ] Update this document
- [ ] Alert on any unusual spend

---

## Monthly Cost Review Template

```markdown
## Cost Review — [Month/Year]

### Actual Spend
- Infrastructure: $[X]
- Stripe: $[X]
- Overages: $[X]
- **Total: $[X]**

### vs. Projection
- Projected: $1240/month (target: $1050)
- Actual: $[X]/month
- Variance: $[X] ([±]X%)

### Key Drivers
1. [Service]: $X ([% of total])
2. [Service]: $X ([% of total])
3. [Service]: $X ([% of total])

### Optimizations Status
- [ ] Batch embeddings: deployed ✅
- [ ] Search cache: deployed ✅
- [ ] Polling reduce: deployed ✅
- [ ] DB pooling: [status]
- [ ] Docker opt: [status]

### Action Items
- [ ] [If overage found] Investigate root cause
- [ ] [If under budget] Document what worked
- [ ] [If new services added] Update cost model

### Next Month
- Projected: $[X]
- Optimization focus: [next priority]
```

---

## Tools & Dashboards

### Built-in
- **Stripe dashboard:** https://dashboard.stripe.com
- **DigitalOcean:** https://cloud.digitalocean.com
- **Supabase:** https://app.supabase.com
- **Grafana (local):** http://100.120.151.91:3000 (Tailscale only)

### To Build (Future)
```typescript
// apps/admin/src/pages/costs.tsx

// Display:
// - Daily spend trend
// - Cost by service
// - Optimization impact
// - Tenant cost breakdown
// - Alerts/warnings
```

---

## Emergency Cost Control

**If spend spikes > 50%:**

1. **Immediate:** Pause non-critical services
   ```bash
   docker-compose -f infra/docker-compose.platform.yml stop notebooklm-agent
   docker-compose -f infra/docker-compose.platform.yml stop airflow
   ```

2. **1-hour:** Investigate root cause
   ```bash
   tail -100 /opt/opsly/runtime/logs/*.log | grep ERROR
   redis-cli -u "$REDIS_URL" KEYS "*" | wc -l  # Queue size
   docker stats  # Resource usage
   ```

3. **1-day:** Implement emergency optimization
   - Disable search temporarily (use mock)
   - Reduce worker concurrency
   - Scale down VPS if possible

4. **1-week:** Permanent fix
   - Root cause analysis
   - New optimization deployment
   - Cost review + prevention plan

---

**Owner:** @devops  
**Last reviewed:** 2026-05-08  
**Next review:** 2026-05-15 (monthly)  
**Escalation:** Cost spike >50% → Page on-call
