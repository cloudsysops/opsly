---
status: canon
owner: infrastructure
last_review: 2026-05-09
---

# Opsly Deployment Architecture: Hybrid Vercel + VPS

**Date**: May 9, 2026  
**Decision**: Hybrid architecture with Vercel for stateless frontends, VPS for stateful core  
**Domain**: `op-sly.com`

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  op-sly.com (Vercel)                    │
│  ├─ Portal (Next.js SSR/ISR)            │ vercel.json configured
│  └─ Admin (Next.js SSR/ISR)             │ vercel.json configured
└──────────────────┬──────────────────────┘
                   │ fetch via CORS
                   │ NEXT_PUBLIC_API_URL=https://api.op-sly.com
                   ▼
┌─────────────────────────────────────────┐
│  api.op-sly.com (VPS Traefik)           │
│  ├─ API (Control Plane)                 │ Node.js/Express
│  ├─ Orchestrator (BullMQ + Redis)       │ Stateful - must stay on VPS
│  ├─ LLM Gateway (Token counting, cache) │ Node.js
│  ├─ Context Builder (Query engine)      │ Node.js
│  ├─ MCP Server (OAuth discovery)        │ Node.js
│  └─ Webhooks (Stripe, n8n, GitHub)      │ Reliable delivery on VPS
│
│  Dependencies:
│  ├─ Redis (persistent state)
│  ├─ Supabase (multi-tenant DB)
│  ├─ Traefik (reverse proxy, TLS)
│  └─ Docker Compose (orchestration)
└─────────────────────────────────────────┘
```

## Why This Split

### Vercel for Portal + Admin

**✅ Advantages:**
- Automatic CDN distribution globally
- Git-based deployments (push to deploy)
- Built-in SSL/TLS with auto-renewal
- Environment variables in Vercel dashboard (encrypted)
- GitHub Actions integration out-of-box
- Instant rollbacks via git revert
- No infrastructure management
- Serverless = automatic scaling (ISR, Edge Functions)

**⚠️ Trade-offs:**
- 15-minute function timeout (fine for HTTP requests)
- Ephemeral filesystem (no local file persistence needed)
- Request body size limit (100MB, sufficient for Next.js)
- Costs: $20-40/month for typical SaaS portal traffic

### VPS (DigitalOcean) for API + Orchestrator

**✅ Advantages:**
- Redis persistence (mandatory for BullMQ queues)
- Long-running processes (orchestrator workers, webhooks)
- Cron jobs without serverless limitations
- Direct control over Docker, networking, volumes
- Predictable latency (no cold starts)
- Webhook receiver for Stripe, n8n (IP whitelist required)
- Already operational, proven, costs sunk (~$40/mo)

**⚠️ Trade-offs:**
- Manual deployment via Docker Compose + scripts
- Admin responsible for SSL/TLS (Traefik + Let's Encrypt handles it)
- Scaling = horizontal (more VPS or K8s, outside scope for now)
- Down time = manual restart

## Domains & DNS

| Service | Domain | Where | DNS Points To |
|---------|--------|-------|----------------|
| Portal | `op-sly.com` | Vercel | Vercel nameservers |
| Admin | `admin.op-sly.com` | Vercel | Vercel nameservers |
| API | `api.op-sly.com` | VPS Traefik | `157.245.223.7` (VPS IP) |
| n8n (per tenant) | `n8n-<slug>.op-sly.com` | VPS Docker | Same VPS IP via Traefik |
| Orchestrator | Internal (no public DNS) | VPS | Redis on `localhost:6379` |

**Setup:**
1. Register `op-sly.com` at registrar (e.g., Namecheap)
2. Point nameservers to Vercel for `op-sly.com` (portal + admin auto-configured)
3. Add CNAME record for `api.op-sly.com` → VPS IP (or use @ if VPS = root)
4. Traefik on VPS handles TLS cert auto-renewal for `api.op-sly.com` and wildcards

## Environment Variables

### Portal (Vercel)

In Vercel dashboard → Settings → Environment Variables:

```bash
# All environments (Preview + Production)
NEXT_PUBLIC_PLATFORM_DOMAIN=op-sly.com
NEXT_PUBLIC_API_URL=https://api.op-sly.com
NEXT_PUBLIC_PORTAL_URL=https://op-sly.com
NEXT_PUBLIC_SUPABASE_URL=<from Doppler prd>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Doppler prd>

# Optional: Analytics, Stripe public key, etc.
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Admin (Vercel)

Same as Portal, plus:

```bash
NEXT_PUBLIC_ADMIN_URL=https://admin.op-sly.com
```

### API (VPS via Doppler)

Kept in Doppler `ops-intcloudsysops/prd`:

```bash
PLATFORM_DOMAIN=op-sly.com
NEXT_PUBLIC_API_URL=https://api.op-sly.com
SUPABASE_URL=<service role, not exposed to browser>
SUPABASE_SERVICE_ROLE_KEY=<secret>
REDIS_URL=redis://localhost:6379/0
STRIPE_SECRET_KEY=sk_live_...
```

Use `doppler run` in Docker Compose to inject at runtime.

## Deployment Pipeline

### Portal & Admin → Vercel

1. **Manual trigger or Git event:**
   ```bash
   git push origin feat/portal-update
   # GitHub creates PR → Vercel creates preview deployment
   # Merge to main → Vercel deploys to production
   ```

2. **Vercel actions:**
   - Runs `npm run build` (Next.js build)
   - Outputs `.next/` directory
   - Distributes to CDN nodes globally
   - TLS cert auto-renewed (Let's Encrypt via Vercel)

3. **Environment promotion:**
   ```
   main → Production (op-sly.com, admin.op-sly.com)
   feat/* → Preview (*.vercel.app)
   ```

### API + Orchestrator → VPS

1. **Manual or CI trigger:**
   ```bash
   # Option A: Direct SSH
   ssh vps-dragon@100.120.151.91
   cd /opt/opsly
   git pull origin main
   docker-compose up -d --build

   # Option B: GitHub Actions (CI/CD)
   # See .github/workflows/deploy.yml
   ```

2. **Docker Compose actions:**
   - Pulls images (or builds from source)
   - Stops old containers
   - Starts new containers with env vars from Doppler
   - Healthcheck waits for API ready

3. **Traefik updates DNS:**
   - Monitors containers by label
   - Auto-routes `api.op-sly.com` → API container
   - Auto-routes `n8n-<slug>.op-sly.com` → tenant n8n

## CORS & Security

### Portal/Admin → API

Both Vercel apps are at `op-sly.com` and `admin.op-sly.com`, making requests to `https://api.op-sly.com`.

**CORS headers from API:**

```typescript
// apps/api/src/middleware/cors.ts
app.use(cors({
  origin: [
    'https://op-sly.com',
    'https://admin.op-sly.com',
    'http://localhost:3000', // local dev
    'http://localhost:3001'  // local dev
  ],
  credentials: true, // allow JWT in cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));
```

**Vercel security headers (in `vercel.json`):**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

## Monitoring & Healthchecks

### Portal/Admin Health

Vercel dashboard → Production → Deployments:
- Green checkmark = app is live
- Logs visible in Vercel console (stderr/stdout)
- Rollback to previous deployment in one click

### API Health

```bash
# From anywhere
curl https://api.op-sly.com/api/health

# Expected response
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-05-09T12:00:00Z",
  "services": {
    "redis": "healthy",
    "supabase": "healthy"
  }
}
```

See `.github/workflows/health-check-*.yml` for scheduled checks.

## Cost Estimate (Monthly)

| Component | Cost | Note |
|-----------|------|------|
| VPS (DigitalOcean $40/mo) | $40 | API, Orchestrator, Redis |
| Vercel (Portal + Admin) | $20-50 | Pay-as-you-go after free tier |
| Supabase (managed) | $0-100+ | Per usage (auth, DB rows, realtime) |
| Stripe (per transaction) | 2.9% + $0.30 | No monthly fee |
| **Total** | **~$100-200/mo** | Scales with tenant usage |

## Rollback Strategy

### Vercel Rollback (Instant)

1. Vercel dashboard → Deployments
2. Click on previous working deployment
3. Click "Promote to Production"
4. Instant (< 1 min)

### VPS Rollback (Git-based)

```bash
# Revert last commit
git revert HEAD
git push origin main

# Docker re-deploy on VPS
docker-compose down
git pull origin main
docker-compose up -d --build
```

## Future Scaling

### Phase 2: Vercel Functions for API (Optional)

If Portal/Admin logic grows complex (real-time sync, heavy compute):
- Move Portal backend logic to Vercel Edge Functions
- Keep orchestration, webhooks on VPS
- Reduces VPS load, increases fault isolation

### Phase 3: Multi-Region VPS (Optional)

If latency becomes issue:
- Deploy secondary VPS (EU, Asia)
- API calls → nearest region (Cloudflare Workers + Geo routing)
- Replicate Redis (Dragonfly, Valkey cluster)

### Phase 4: Kubernetes (If Needed)

Only if:
- 10,000+ RPS (Vercel handles auto-scaling)
- <100ms p99 latency requirement (VPS already meets this)
- Multi-region mandatory for compliance

Not recommended unless forced by scale.

## Checklist: Go-Live with `op-sly.com`

- [ ] Register `op-sly.com` at registrar
- [ ] Add Vercel nameservers (Vercel dashboard instructions)
- [ ] Verify `op-sly.com` DNS resolves (dig/nslookup)
- [ ] Create Vercel projects for Portal + Admin
- [ ] Link GitHub repos to Vercel projects
- [ ] Set environment variables in Vercel dashboard (all above vars)
- [ ] Test Portal deploy: `https://op-sly.com` should load
- [ ] Test Admin deploy: `https://admin.op-sly.com` should load
- [ ] Add CNAME for `api.op-sly.com` → VPS IP
- [ ] Update Traefik on VPS config: `api.op-sly.com` routing rule
- [ ] Request TLS cert from Let's Encrypt (Traefik + Cloudflare DNS plugin)
- [ ] Test API health: `curl https://api.op-sly.com/api/health`
- [ ] Update `context/system_state.json` → `op-sly.com` (done ✅)
- [ ] Smoke test: Login to Portal → fetch data from API
- [ ] Monitor Vercel logs, VPS logs for errors (24h)
- [ ] Update runbooks in `/docs/01-development/`

---

**Questions?** Refer to `.github/workflows/deploy.yml` (CI/CD) or `.claude/CLAUDE.md` (operational commands).
