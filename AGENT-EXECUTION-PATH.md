# 🎯 EXECUTION PATH FOR SECURITY FIXES
## Clear Route for Next Agent to Execute Everything

**Total Time:** 8-12 hours  
**Complexity:** Medium  
**Prerequisites:** npm, Doppler CLI, Supabase CLI  
**Status:** ✅ READY TO EXECUTE

---

## 📍 WHERE TO START

When you pick up this task, follow this exact sequence:

```
START
  ↓
READ DOCUMENTATION (15 min)
  ├─→ SECURITY-AUDIT.md (627 lines - understand what's vulnerable)
  ├─→ SECURITY-REMEDIATION-RUNBOOK.md (798 lines - step-by-step guide)
  └─→ This file (navigation guide)
  ↓
PHASE 1: CRITICAL FIXES (1 hour)
  ├─→ Update @auth/core + next-auth
  ├─→ Update Next.js
  ├─→ npm audit fix
  ├─→ Verify type-check + build
  └─→ Commit + Push
  ↓
PHASE 2: HIGH-PRIORITY FIXES (3-4 hours)
  ├─→ Apply Supabase migrations
  ├─→ Regenerate TypeScript types
  ├─→ Remove @ts-ignore annotations
  ├─→ Implement admin JWT validation
  ├─→ Verify everything compiles
  └─→ Commit + Push
  ↓
PHASE 3: MEDIUM-PRIORITY (2-3 hours) [OPTIONAL - NEXT SPRINT]
  ├─→ Add rate limiting middleware
  ├─→ Configure CORS headers
  ├─→ Docker security hardening
  └─→ Commit + Push
  ↓
PHASE 4: LOW-PRIORITY (2-3 hours) [OPTIONAL - NEXT MONTH]
  ├─→ Security headers middleware
  ├─→ CI/CD scanning pipeline
  └─→ Commit + Push
  ↓
FINAL VERIFICATION (30 min)
  ├─→ npm audit (0 vulnerabilities)
  ├─→ npm run type-check (0 errors)
  ├─→ npm run build (success)
  ├─→ npm run test (passing)
  └─→ Admin endpoints require JWT (401 without auth)
  ↓
SUCCESS ✅
  └─→ Production-ready
```

---

## 📚 DOCUMENTATION MAP

### Quick Reference (this file)
- **Purpose:** Navigation guide
- **Read Time:** 5 minutes
- **Action:** Navigate to detailed docs

### SECURITY-AUDIT.md (627 lines)
- **Purpose:** Understand ALL vulnerabilities
- **Key Sections:**
  - Executive Summary (table format)
  - Critical vulnerabilities (2 issues)
  - High severity (9 issues)
  - Medium/Low severity (5 issues)
  - Infrastructure issues
  - Authentication gaps
  - API security
  - Deployment blockers

**When to read:** Before starting Phase 1  
**Why:** Understand the "why" behind each fix

### SECURITY-REMEDIATION-RUNBOOK.md (798 lines)
- **Purpose:** Step-by-step instructions
- **Structure:**
  - Pre-flight checklist
  - PHASE 1: Exact bash commands (30 min)
  - PHASE 2: Exact bash commands (3-4 hrs)
  - PHASE 3: Code changes (2-3 hrs)
  - PHASE 4: Advanced hardening (2-3 hrs)
  - Verification checklist
  - Troubleshooting guide

**When to use:** While executing the fixes  
**Why:** Copy/paste commands, exact line numbers for edits

---

## 🚀 QUICK START (Copy this)

```bash
# 1. Read documentation first
cat SECURITY-AUDIT.md | head -100
cat SECURITY-REMEDIATION-RUNBOOK.md | head -50

# 2. Run Phase 1 (30 minutes)
cd /home/user/opsly
npm update @auth/core next-auth next@latest --workspace-root
npm audit fix
npm audit fix --force
npm run type-check
npm run build
git add -A && git commit -m "security(critical): fix auth/Next.js vulnerabilities"
git push origin claude/peskids-scope-review-3xAZz

# 3. Run Phase 2 (3-4 hours - requires Doppler)
# Follow SECURITY-REMEDIATION-RUNBOOK.md section "PHASE 2" step by step

# 4. Verify
npm audit --production
npm run type-check
npm run build
```

---

## 📋 EXACT EXECUTION STEPS

### PRE-EXECUTION CHECKLIST (Do this first!)

```bash
# Verify you have everything you need
echo "=== CHECKING PREREQUISITES ==="

# Check Node version
node --version        # Should be v22+
npm --version         # Should be 10+

# Check CLI tools
doppler --version     # Should be latest
supabase --version    # Should be latest

# Check git
git status            # Should be clean
git branch            # Should show current branch

# Check Doppler access
echo "Testing Doppler access..."
doppler secrets --project ops-intcloudsysops --config prd list | head -3

# ALL CHECKS MUST PASS BEFORE CONTINUING
echo "✅ All prerequisites met"
```

If any check fails → STOP and fix that first

---

### PHASE 1 EXECUTION (30 minutes)

**Copy-paste this entire block:**

```bash
#!/bin/bash
set -e

echo "🔴 PHASE 1: CRITICAL SECURITY FIXES"
echo "======================================"
cd /home/user/opsly

echo "Step 1: Update @auth/core & next-auth..."
npm update @auth/core next-auth --workspace-root
npm ls @auth/core next-auth | head -5

echo "Step 2: Update Next.js..."
npm update next@latest --workspace-root
npm ls next | head -3

echo "Step 3: Run npm audit fix..."
npm audit fix
npm audit fix --force

echo "Step 4: Verify type-check..."
npm run type-check 2>&1 | tail -5

echo "Step 5: Verify build..."
npm run build 2>&1 | tail -5

echo "Step 6: Commit changes..."
git status
git add -A
git commit -m "security(critical): fix auth/Next.js vulnerabilities

FIXES:
- Update @auth/core to patch OAuth bypass
- Update next-auth to 5.0.0
- Update Next.js to 14.2.3+ (patch SSRF, DoS)
- Update PostCSS, sharp, dompurify
- Fix eslint dependency chain

SEVERITY: CRITICAL - Blocks production"

echo "Step 7: Push to GitHub..."
git push origin claude/peskids-scope-review-3xAZz

echo "✅ PHASE 1 COMPLETE ($(date))"
```

**After Phase 1:**
- ✅ Auth vulnerabilities fixed
- ✅ Next.js SSRF/DoS fixed
- ✅ Code compiles
- ✅ Changes pushed

---

### PHASE 2 EXECUTION (3-4 hours)

**This requires Doppler access. Do NOT run if you don't have it.**

```bash
#!/bin/bash
set -e

echo "🟠 PHASE 2: APPLY MIGRATIONS & ADMIN AUTH"
echo "========================================="

# STEP 2.1: Verify Doppler
echo "Verifying Doppler access..."
doppler secrets --project ops-intcloudsysops --config prd list | head -3

# STEP 2.2: Apply migrations
echo "Applying Supabase migrations..."
doppler run --project ops-intcloudsysops --config prd -- \
  supabase migration list --project-id jkwykpldnitavhmtuzmo

doppler run --project ops-intcloudsysops --config prd -- \
  supabase db push --project-id jkwykpldnitavhmtuzmo

sleep 30
echo "Verifying migrations applied..."

# STEP 2.3: Regenerate types
echo "Regenerating TypeScript types..."
doppler run --project ops-intcloudsysops --config prd -- \
  supabase gen types typescript --project-id jkwykpldnitavhmtuzmo \
  > apps/peskids/lib/types/database.gen.ts

# STEP 2.4: Remove @ts-ignore
echo "Removing temporary @ts-ignore annotations..."
sed -i '/\/\/ @ts-ignore: Tables pending migration/d' \
  apps/peskids/lib/services/points.service.ts
sed -i '/\/\/ @ts-ignore: Tables pending migration/d' \
  apps/peskids/lib/services/store.service.ts
sed -i '/\/\/ @ts-ignore: Table pending migration/d' \
  apps/peskids/lib/services/store-checkout.service.ts

# STEP 2.5: Implement admin JWT validation
# ⚠️ MANUAL STEP: Edit these 2 files (see SECURITY-REMEDIATION-RUNBOOK.md Section 2.5)
echo "⚠️  MANUAL STEP: Implement admin JWT validation"
echo "  Edit: apps/peskids/app/api/admin/crm/contacts/route.ts (line 16)"
echo "  Edit: apps/peskids/app/api/admin/franchises/route.ts (line 30)"
echo "  Add: const auth = await validateAdminJWT(request);"
echo "  See SECURITY-REMEDIATION-RUNBOOK.md section 2.5"
read -p "Press ENTER when done editing the 2 admin routes..."

# STEP 2.6: Verify
echo "Verifying everything compiles..."
npm run type-check 2>&1 | tail -5
npm run lint 2>&1 | tail -5
npm run build 2>&1 | tail -5

# STEP 2.7: Commit
echo "Committing changes..."
git status
git add -A
git commit -m "security(high): apply migrations and admin auth

CHANGES:
- Apply Supabase migrations (4 pending migrations)
- Regenerate TypeScript types from schema
- Remove temporary @ts-ignore annotations
- Implement JWT validation on admin endpoints

SECURITY: RLS now enforced, multi-tenant isolation complete"

# STEP 2.8: Push
echo "Pushing to GitHub..."
git push origin claude/peskids-scope-review-3xAZz

echo "✅ PHASE 2 COMPLETE ($(date))"
```

**After Phase 2:**
- ✅ Database migrations applied
- ✅ Types regenerated
- ✅ Admin routes protected with JWT
- ✅ All compiles
- ✅ Changes pushed

---

### PHASE 3 EXECUTION (2-3 hours, optional but recommended)

**See SECURITY-REMEDIATION-RUNBOOK.md section "PHASE 3"**

Add:
1. Rate limiting middleware
2. CORS configuration
3. Docker security hardening

---

### PHASE 4 EXECUTION (2-3 hours, optional, for next month)

**See SECURITY-REMEDIATION-RUNBOOK.md section "PHASE 4"**

Add:
1. Security headers
2. CI/CD scanning pipeline

---

## ✅ FINAL VERIFICATION (30 minutes)

Run this after completing Phase 2:

```bash
#!/bin/bash
echo "🎯 FINAL VERIFICATION CHECKLIST"
echo "==============================="

# 1. Dependencies
echo "✓ Checking dependencies..."
npm audit --production
# Expected: 0 vulnerabilities (or only low-severity)

# 2. Type-check
echo "✓ Checking TypeScript..."
npm run type-check 2>&1 | tail -5
# Expected: 0 errors

# 3. Build
echo "✓ Checking build..."
npm run build 2>&1 | tail -5
# Expected: ✓ Build successful

# 4. Tests
echo "✓ Running tests..."
npm run test 2>&1 | tail -10
# Expected: ✓ All passing

# 5. Admin auth
echo "✓ Testing admin auth..."
curl -s http://localhost:3004/api/admin/crm/contacts \
  -H "Authorization: Bearer invalid" | grep -o "Unauthorized" || echo "❌ Auth not working"
# Expected: Unauthorized response

# 6. Git log
echo "✓ Checking git commits..."
git log --oneline -6
# Expected: All security commits visible

echo "✅ VERIFICATION COMPLETE"
```

---

## 🎯 SUCCESS CRITERIA

You know you're done when:

- [ ] npm audit shows 0 critical/high vulnerabilities
- [ ] npm run type-check passes with 0 errors
- [ ] npm run build completes successfully
- [ ] npm run test passes
- [ ] /api/admin/* routes return 401 without JWT
- [ ] Database has RLS enforced
- [ ] All commits pushed to GitHub
- [ ] PR shows all security fixes applied

---

## 📞 REFERENCE DOCUMENTS

| Document | Location | Purpose |
|----------|----------|---------|
| Security Audit | `SECURITY-AUDIT.md` | Understand all 16 vulnerabilities |
| Remediation Guide | `SECURITY-REMEDIATION-RUNBOOK.md` | Step-by-step instructions |
| Validation Report | `VALIDATION-REPORT.md` | Overall system assessment |
| Migration Status | `MIGRATION-STATUS.md` | Database migration tracker |
| This File | `AGENT-EXECUTION-PATH.md` | Navigation & overview |

---

## 🆘 IF YOU GET STUCK

### Problem: "npm audit still shows vulnerabilities"
**Solution:**
```bash
npm cache clean --force
npm install --workspace-root
npm audit fix --force
npm audit
```

### Problem: "Supabase migrations fail"
**Solution:**
```bash
# Check Doppler access
doppler secrets list --project ops-intcloudsysops --config prd

# Check migration status
doppler run --project ops-intcloudsysops --config prd -- \
  supabase migration status --project-id jkwykpldnitavhmtuzmo

# Check logs
doppler run --project ops-intcloudsysops --config prd -- \
  supabase db execute "SELECT * FROM information_schema.tables LIKE 'student_points';"
```

### Problem: "Type-check still fails after applying migrations"
**Solution:**
```bash
# Clear cache and regenerate
rm apps/peskids/lib/types/database.gen.ts
doppler run --project ops-intcloudsysops --config prd -- \
  supabase gen types typescript --project-id jkwykpldnitavhmtuzmo \
  > apps/peskids/lib/types/database.gen.ts
```

### Problem: "Admin auth not working"
**Solution:**
```bash
# Check the files were edited correctly
grep -A5 "validateAdminJWT" \
  apps/peskids/app/api/admin/crm/contacts/route.ts
grep -A5 "validateAdminJWT" \
  apps/peskids/app/api/admin/franchises/route.ts

# Verify import statement exists at top of file
head -20 apps/peskids/app/api/admin/crm/contacts/route.ts | \
  grep "validateAdminJWT"
```

---

## 📊 PROGRESS TRACKING

Use this to track your progress:

```
PHASE 1: CRITICAL FIXES
  [ ] Update @auth/core
  [ ] Update next-auth
  [ ] Update Next.js
  [ ] npm audit fix
  [ ] Type-check passes
  [ ] Build passes
  [ ] Committed & Pushed

PHASE 2: HIGH-PRIORITY
  [ ] Migrations applied
  [ ] Types regenerated
  [ ] @ts-ignore removed
  [ ] Admin JWT implemented (2 routes)
  [ ] Type-check passes
  [ ] Build passes
  [ ] Committed & Pushed

PHASE 3: MEDIUM (Optional)
  [ ] Rate limiting added
  [ ] CORS configured
  [ ] Docker hardened
  [ ] Committed & Pushed

PHASE 4: LOW (Optional)
  [ ] Security headers added
  [ ] CI/CD scanning configured
  [ ] Committed & Pushed

FINAL VERIFICATION
  [ ] npm audit: 0 vulnerabilities
  [ ] npm run type-check: 0 errors
  [ ] npm run build: ✓
  [ ] npm run test: ✓
  [ ] Admin auth: ✓
```

---

## 🎓 LEARNING RESOURCES

Understanding what you're fixing:

- **OAuth/Auth vulnerabilities:** https://owasp.org/www-community/attacks/csrf
- **SSRF attacks:** https://owasp.org/www-community/attacks/Server-Side_Request_Forgery
- **RLS (Row-Level Security):** https://supabase.com/docs/guides/auth/row-level-security
- **Rate limiting:** https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html
- **Docker security:** https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html

---

## ✨ NEXT STEPS AFTER COMPLETION

1. **Code review:** PR will be reviewed by security team
2. **Testing:** Manual security testing recommended
3. **Deployment:** Merge after approval and deploy to production
4. **Monitoring:** Set up security monitoring + audit logging
5. **Follow-ups:** Schedule weekly security audits

---

**Created:** 2026-07-26  
**Status:** ✅ Ready for execution  
**Questions?** Review SECURITY-AUDIT.md and SECURITY-REMEDIATION-RUNBOOK.md

**Ready to execute? Start with the Quick Start section above! 🚀**
