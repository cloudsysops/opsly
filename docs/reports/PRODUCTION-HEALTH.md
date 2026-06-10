---
status: draft
owner: devops
created: 2026-06-10
purpose: "Production system health check - deployment validation"
---

# PRODUCTION HEALTH AUDIT

**Objective:** Verify all services are running and healthy.

**Timeline:** 5 minutes  
**Method:** Health endpoint checks + manual verification

---

## SERVICES & HEALTH ENDPOINTS

### 1. API (Control Plane)

**Service:** Opsly API  
**Expected Port:** 3000  
**Health Endpoint:** `GET /api/health`

**Test Command:**
```bash
curl -X GET http://api.op-sly.com/api/health \
  -H "Accept: application/json"
```

**Expected Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-06-10T20:00:00Z",
  "services": {
    "database": "ok",
    "redis": "ok",
    "supabase": "ok"
  }
}
```

**Result:** ☐ PASS / ☐ FAIL

**What to check if FAIL:**
- [ ] VPS online? (`ping api.op-sly.com`)
- [ ] Docker running? (`docker ps | grep api`)
- [ ] Doppler secrets set? (`doppler secrets list`)
- [ ] Database connected? (check logs)

---

### 2. Portal

**Service:** Opsly Portal (Next.js)  
**Expected Port:** 3002 (local) or Vercel  
**Health Check:** Can load home page

**Test:**
1. Navigate to: `https://op-sly.com` (or `http://localhost:3002`)
2. Should load in <3 seconds
3. Check for JS errors in console (F12)

**Expected:**
- Page loads
- No 500 errors
- CSS/images load
- API calls succeed

**Result:** ☐ PASS / ☐ FAIL

**What to check if FAIL:**
- [ ] Vercel deployment active?
- [ ] Environment variables set in Vercel?
- [ ] API URL reachable from portal?

---

### 3. Admin Dashboard

**Service:** Opsly Admin (Next.js)  
**Expected Port:** 3001 (local) or Vercel  
**Health Check:** Can load home page

**Test:**
1. Navigate to: `https://admin.op-sly.com` (or `http://localhost:3001`)
2. Should load in <3 seconds
3. Check for JS errors

**Expected:**
- Page loads
- Auth page appears (if not logged in)
- Dashboard accessible (if logged in)

**Result:** ☐ PASS / ☐ FAIL

---

### 4. ICSO Website

**Service:** ICSO Marketing Site  
**Expected Port:** 3015 (local)  
**Health Check:** Can load contact page

**Test:**
1. Navigate to: `http://localhost:3015/contact`
2. Contact form loads
3. Try submitting (tests /api/leads endpoint)

**Expected:**
- Page loads in <2 seconds
- Form renders correctly
- No console errors

**Result:** ☐ PASS / ☐ FAIL

---

### 5. Peskids App

**Service:** Peskids Portal/Dashboard  
**Expected Port:** 3004 (local)  
**Health Check:** Can load app

**Test:**
1. Navigate to: `http://localhost:3004`
2. App loads
3. Check console for errors

**Expected:**
- Page loads
- Auth required or dashboard visible
- No critical JS errors

**Result:** ☐ PASS / ☐ FAIL

---

### 6. n8n (Peskids)

**Service:** n8n Workflow Engine  
**Expected Port:** Varies (docker-compose defines it)  
**Health Check:** Service running, UI accessible

**Test:**
1. Check which port: `docker ps | grep n8n-peskids`
2. Navigate to: `http://localhost:{PORT}` or `https://n8n-peskids.op-sly.com`
3. Should show n8n login

**Expected:**
- n8n UI accessible
- No connection errors
- Workflows visible in editor

**Result:** ☐ PASS / ☐ FAIL

**What to check if FAIL:**
- [ ] Container running? (`docker ps | grep n8n`)
- [ ] Port exposed? (check docker-compose)
- [ ] Network connectivity? (can VPS reach container?)

---

### 7. Redis

**Service:** Redis (state & queues)  
**Expected Port:** 6379 (localhost on VPS)

**Test (from VPS):**
```bash
redis-cli PING
# Expected: PONG
```

**Or via Docker:**
```bash
docker exec opsly-redis redis-cli PING
# Expected: PONG
```

**Result:** ☐ PASS / ☐ FAIL

**What to check if FAIL:**
- [ ] Redis container running?
- [ ] Volume mounted correctly?
- [ ] Data persisted?

---

### 8. Traefik (Reverse Proxy)

**Service:** Traefik (load balancer, TLS)  
**Expected Port:** 80, 443 (public); 8080 (admin dashboard)

**Test (from VPS):**
```bash
curl -X GET http://localhost:8080/ping
# Expected: OK
```

**Or check domains:**
```bash
curl -I https://api.op-sly.com
# Expected: HTTP 200 OK with SSL cert
```

**Result:** ☐ PASS / ☐ FAIL

**What to check if FAIL:**
- [ ] Traefik running? (`docker ps | grep traefik`)
- [ ] SSL certs renewed? (check Let's Encrypt)
- [ ] Routing rules correct? (check traefik config)

---

### 9. Supabase (Database)

**Service:** Supabase (PostgreSQL)  
**Expected:** Managed service (SaaS)

**Test:**
```bash
# From any API request, if database queries work, Supabase is OK
# OR directly:
psql postgresql://{user}:{pass}@{host}:{port}/{db} -c "SELECT 1"
# Expected: 1 row returned
```

**Or via Supabase dashboard:**
1. Go to: `https://app.supabase.com`
2. Log in
3. Select project `jkwykpldnitavhmtuzmo`
4. Should show databases and tables

**Result:** ☐ PASS / ☐ FAIL

**What to check if FAIL:**
- [ ] Supabase account active?
- [ ] Database not at capacity?
- [ ] Connection string correct in API?

---

## UPTIME SUMMARY

| Service | Port | Status | Notes |
|---------|------|--------|-------|
| **API** | 3000 | ☐ UP / ☐ DOWN | /api/health endpoint |
| **Portal** | Vercel | ☐ UP / ☐ DOWN | Deployment status |
| **Admin** | Vercel | ☐ UP / ☐ DOWN | Deployment status |
| **ICSO** | 3015 | ☐ UP / ☐ DOWN | /contact page loads |
| **Peskids** | 3004 | ☐ UP / ☐ DOWN | App accessible |
| **n8n** | 3005+ | ☐ UP / ☐ DOWN | UI accessible |
| **Redis** | 6379 | ☐ UP / ☐ DOWN | PING works |
| **Traefik** | 80/443 | ☐ UP / ☐ DOWN | Routes responding |
| **Supabase** | Remote | ☐ UP / ☐ DOWN | Queries working |

**Overall Uptime:** ☐ **ALL PASS** / ☐ **PARTIAL** / ☐ **FAIL**

---

## KEY ENDPOINTS TO TEST

| Endpoint | Method | Expected | Result |
|----------|--------|----------|--------|
| `/api/health` | GET | 200 OK | ☐ PASS |
| `/api/portal/invites` | GET | 200 OK | ☐ PASS |
| `/api/leads` | POST | 201 Created | ☐ PASS |
| `/webhooks/gohighlevel/leads` | POST | 200 OK | ☐ PASS |
| `/webhooks/n8n/trigger` | POST | 200 OK | ☐ PASS |
| `/.well-known/healthz` | GET | 200 OK | ☐ PASS |

---

## DOCKER COMPOSE STATUS

**Check all services:**
```bash
docker-compose ps
```

**Expected output:**
```
NAME                      SERVICE        STATUS
opsly-api                 api            Up
opsly-redis               redis          Up
opsly-nginx               nginx          Up (or Traefik)
opsly-n8n-peskids        n8n-peskids    Up
```

**If any service DOWN:**
```bash
docker-compose logs {service_name}
# Review last 50 lines for errors
```

---

## SSL/TLS CERTIFICATE STATUS

**Check certificates:**
```bash
docker exec opsly-traefik ls -la /letsencrypt/
```

**Check cert expiry:**
```bash
openssl x509 -in /path/to/cert.pem -dates -noout
```

**Expected:** Expiry date >30 days in future

**If expired or expiring soon:**
- Traefik auto-renews (Let's Encrypt)
- Check logs: `docker logs opsly-traefik | grep cert`

---

## LOGS TO CHECK IF ISSUES

```bash
# API
docker logs opsly-api --tail 50

# n8n
docker logs opsly-n8n-peskids --tail 50

# Traefik
docker logs opsly-traefik --tail 50

# Redis
docker logs opsly-redis --tail 50
```

---

## PERFORMANCE BASELINES

| Metric | Expected | Result |
|--------|----------|--------|
| API response time | <200ms | ☐ OK |
| Portal page load | <2s | ☐ OK |
| Database query | <100ms | ☐ OK |
| Redis operation | <10ms | ☐ OK |
| Webhook processing | <5s | ☐ OK |

---

## CRITICAL FAILURES

| Failure | Impact | Recovery |
|---------|--------|----------|
| API down | All services down | Restart: `docker restart opsly-api` |
| Redis down | Queues fail, sessions lost | Restart: `docker restart opsly-redis` |
| Database down | No data access | Check Supabase dashboard |
| Traefik down | No external access | Restart: `docker restart traefik` |
| n8n down | Workflows don't execute | Restart: `docker restart opsly-n8n-peskids` |

---

## SIGN-OFF

**All systems operational?**

☐ **YES** — All 9 services UP, no errors  
☐ **PARTIAL** — Some services UP, minor issues  
☐ **NO** — Critical failures, system down

**Issues found:**
```
1. _________________________________
2. _________________________________
3. _________________________________
```

**Resolution status:**
☐ Fixed immediately  
☐ Escalated for tomorrow  
☐ Blocking go-live
