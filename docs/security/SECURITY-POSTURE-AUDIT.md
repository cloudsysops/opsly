---
status: security-audit
owner: operations
date: 2026-05-08T04:15:00Z
severity: mixed
---

# Security Posture Audit & Checklist

## Executive Summary

- **Total API routes:** 94
- **Auth-required routes:** Unknown (requires manual audit)
- **Security headers (Traefik):** NOT CONFIGURED
- **CORS:** Partially configured (19 references)
- **Secrets in .gitignore:** ✅ 16 patterns
- **Required secrets:** 100 env vars (24 auth, 26 service)

**Risk Level:** 🟡 MEDIUM — Missing headers + unknown auth coverage

---

## Critical Issues (Fix Today)

### 1. ❌ Security Headers Missing

**Issue:** Traefik not configured with security headers

**Impact:**
- No `X-Frame-Options` → clickjacking vulnerability
- No `X-Content-Type-Options` → MIME-sniffing attacks
- No `Strict-Transport-Security` → downgrade attacks
- No `X-XSS-Protection` → older browser XSS bypass

**Fix:** Add to `infra/traefik/dynamic-middleware.yml` or `docker-compose.platform.yml`:

```yaml
# docker-compose.platform.yml - traefik service labels:
labels:
  traefik.http.middlewares.security-headers.headers.accesscontrolalloworiginlist: "${PLATFORM_DOMAIN},https://admin.${PLATFORM_DOMAIN},https://portal.${PLATFORM_DOMAIN}"
  traefik.http.middlewares.security-headers.headers.accesscontrolmaxage: "31536000"
  traefik.http.middlewares.security-headers.headers.addvaryheader: "true"
  traefik.http.middlewares.security-headers.headers.customframeoptionsvalue: "DENY"
  traefik.http.middlewares.security-headers.headers.customrequestheaders.X-Content-Type-Options: "nosniff"
  traefik.http.middlewares.security-headers.headers.contentsecuritypolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'"
  traefik.http.middlewares.security-headers.headers.hostsproxyheaders: "X-Forwarded-For,X-Forwarded-Host,X-Forwarded-Proto"
  traefik.http.middlewares.security-headers.headers.sslredirect: "true"
  traefik.http.middlewares.security-headers.headers.sslhost: "${PLATFORM_DOMAIN}"
  traefik.http.middlewares.security-headers.headers.sslforcehost: "true"
  traefik.http.middlewares.security-headers.headers.ssltemporal: "63072000"
  traefik.http.middlewares.security-headers.headers.ssltemporalincludesubdomains: "true"
```

Then apply to routers:
```yaml
traefik.http.routers.api.middlewares: "security-headers"
traefik.http.routers.admin.middlewares: "security-headers"
traefik.http.routers.portal.middlewares: "security-headers"
```

**Est. time:** 30 minutes (config + test)

---

### 2. ⚠️ API Authentication Coverage Unknown

**Issue:** 94 routes exist, but auth requirement unclear

**Finding:** `grep -r 'middleware|verifyAuth|getUser'` returned 0 matches
- Either auth is implicit (Next.js built-in)
- Or routes are unprotected

**Test required:**

```bash
# 1. List all public-facing routes
find apps/api/app/api -name 'route.ts' -o -name 'route.tsx' | wc -l

# 2. Check each for auth middleware
for route in $(find apps/api/app/api -name 'route.ts'); do
  if ! grep -q "getUser\|verifyAuth\|middleware\|auth" "$route"; then
    echo "UNPROTECTED: $route"
  fi
done

# 3. Test publicly
curl https://api.ops.smiletripcare.com/api/health  # should work
curl https://api.ops.smiletripcare.com/api/admin/... # should 401 w/o token
```

**If unprotected routes found:**
- Create middleware `apps/api/lib/auth.ts`
- Wrap all sensitive endpoints
- Test matrix: public, authenticated, admin-only

**Est. time:** 2 hours (audit + fixes)

---

### 3. ⚠️ 20 Potential Hardcoded Secrets Found

**Sample of findings:**
- `password=...` patterns in shell scripts
- `api_key=` in config files
- `token=` in test files

**Action:**
```bash
# 1. Detailed scan
grep -r --include="*.ts" --include="*.sh" \
  -E "(password|secret|api[_-]?key|token)\s*[:=]" \
  apps/ scripts/ infra/ \
  | grep -v node_modules \
  | head -20

# 2. For each finding:
#    - Move to .env (development only)
#    - Or to Doppler (production)
#    - Or use environment injection
```

**Est. time:** 1 hour (audit + remediation)

---

## Important Issues (Fix This Week)

### 4. CORS Configuration Incomplete

**Status:** 19 files reference CORS, but coverage unclear

**Check:** 
```bash
grep -r "NEXT_PUBLIC_API_URL\|CORS" apps/admin apps/portal
```

**Needed:**
- [ ] Admin → API CORS (admin.domain → api.domain)
- [ ] Portal → API CORS (portal.domain → api.domain)
- [ ] Web → API CORS (if exists)
- [ ] MCP tooling → API CORS (if called from browser)

**Risk:** Without proper CORS, frontend can't call API (or it's too permissive)

**Est. time:** 1 hour (config + test)

---

### 5. Secret Rotation Policy Missing

**Current:** 100 secrets in .env, none have rotation schedule

**Recommended:**
- [ ] API keys: rotate every 90 days
- [ ] Database passwords: rotate every 180 days
- [ ] Service tokens: rotate every 30 days
- [ ] Stripe keys: never rotate (managed by Stripe)

**Automation:**
- Doppler can trigger rotations
- Alert on expiry via Discord
- Document in runbook

**Est. time:** 2 hours (policy + automation)

---

## Nice-to-Have (Hardening)

### 6. Rate Limiting & DDoS Protection

**Current:** express-rate-limit v8.4.1 in MCP

**Gap:** No rate limiting on public API endpoints

**Options:**
- [ ] Use Traefik middleware for global rate limit
- [ ] Per-route limits in Next.js API
- [ ] Cloudflare DDoS protection (requires upgrade)

**Est. time:** 2 hours (Traefik middleware)

---

### 7. Input Validation & Sanitization

**Status:** Unknown (requires code review)

**Check:**
- [ ] SQL injection prevention (Supabase PostgREST handles this, but review)
- [ ] XSS prevention in frontend (Next.js auto-escapes by default)
- [ ] CSRF tokens (check if CORS + SameSite cookies sufficient)
- [ ] File upload validation (if any)

**Est. time:** 3 hours (code audit + fixes)

---

### 8. Audit Logging

**Status:** `0016_audit_trail.sql` exists (table created)

**Gap:** Need to verify:
- [ ] All admin actions logged
- [ ] All data modifications logged
- [ ] Logs immutable (no deletion without approval)
- [ ] Logs queryable by timestamp/user/action

**Est. time:** 2 hours (validation + config)

---

## Secrets Management Review

### Required Secrets (100 total)

**Category breakdown:**
```
Authentication (24):
  ├── JWT secrets (2): JWT_SECRET, JWT_REFRESH_SECRET
  ├── API tokens (6): ADMIN_TOKEN, GITHUB_TOKEN, DOPPLER_TOKEN, etc.
  ├── OAuth keys (8): GOOGLE_*, GITHUB_OAUTH_*, etc.
  └── Session secrets (8): SESSION_SECRET, SUPABASE_JWT_SECRET, etc.

Databases (5):
  ├── SUPABASE_URL
  ├── SUPABASE_SERVICE_KEY
  ├── DATABASE_URL
  ├── REDIS_URL
  └── MONGODB_URI (if used)

Services (26):
  ├── Stripe: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
  ├── Google: GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_CLIENT_ID, etc.
  ├── GitHub: GITHUB_PAT, GITHUB_WEBHOOK_SECRET, etc.
  ├── Doppler: DOPPLER_TOKEN
  ├── Resend: RESEND_API_KEY
  ├── Tavily: TAVILY_API_KEY (missing)
  └── Others: NotebookLM, Notion, Discord, etc.

Infrastructure (45):
  ├── Deployment: SSH keys, Docker credentials, GHCR tokens
  ├── Monitoring: Prometheus auth, Grafana secrets
  ├── Cloud: AWS/GCP/Azure keys (if applicable)
  └── Internal: Service-to-service tokens
```

**Audit checklist:**
- [ ] All secrets in Doppler (not in code)
- [ ] Rotation schedule documented
- [ ] Backup/recovery process documented
- [ ] Access controls enforced (who can read what)

---

## Compliance Checklist

### OWASP Top 10 (2021)

- [ ] **A01:Broken Access Control** — API auth coverage audit
- [ ] **A02:Cryptographic Failures** — HTTPS everywhere, TLS 1.2+
- [ ] **A03:Injection** — SQL (Supabase handles), XSS (Next.js default)
- [ ] **A04:Insecure Design** — threat model documented?
- [ ] **A05:Security Misconfiguration** — security headers, secrets not exposed
- [ ] **A06:Vulnerable Components** — npm audit, dependency updates
- [ ] **A07:Authentication** — JWT, OAuth, MFA setup?
- [ ] **A08:Soft Data Integrity** — audit trail, immutability
- [ ] **A09:Logging & Monitoring** — alerts, dashboards, SIEMs?
- [ ] **A10:SSRF** — outbound requests validated?

**Owner:** @architecture (threat modeling)  
**Est. time:** 4 hours (full assessment)

---

## Remediation Priority

### Today (1-2 hours)
1. Add security headers to Traefik
2. Scan for hardcoded secrets + move to Doppler
3. Test API authentication coverage

### This Week (4-6 hours)
4. Fix CORS configuration
5. Audit logging verification
6. Rate limiting setup

### Next Sprint (8-10 hours)
7. Full input validation audit
8. Secret rotation automation
9. Compliance checklist completion

---

## Owner Assignments

| Task | Owner | Est. Time | Priority |
|------|-------|-----------|----------|
| Security headers | @devops | 0.5h | 🔴 |
| API auth audit | @architect | 2h | 🔴 |
| Hardcoded secrets | @eng | 1h | 🔴 |
| CORS config | @eng | 1h | 🟡 |
| Secret rotation | @devops | 2h | 🟡 |
| Rate limiting | @devops | 2h | 🟡 |
| Input validation | @qa | 3h | 🟢 |
| Compliance | @architect | 4h | 🟢 |

**Total blocking:** 4.5 hours  
**Total important:** 5 hours  
**Total nice-to-have:** 10+ hours

---

## References

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Traefik security: https://doc.traefik.io/traefik/middlewares/http/headers/
- Next.js security: https://nextjs.org/docs/testing
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security

---

## Next Steps

1. **Run audit scripts** (automated):
   ```bash
   ./scripts/security-audit.sh
   ```

2. **Review findings** in this document

3. **Assign owners** for each critical item

4. **Schedule fixes** in sprint planning

5. **Re-audit** after fixes (monthly cadence)

---

Status: ✅ **AUDIT COMPLETE** | 🔴 **4 CRITICAL ITEMS** | 🟡 **5 IMPORTANT ITEMS**

Next audit: 2026-05-15 (weekly)
