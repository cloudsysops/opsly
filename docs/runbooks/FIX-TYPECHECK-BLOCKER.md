---
status: runbook
owner: operations
last_update: 2026-05-08T03:50:00Z
context: type-check blocker, Next.js cache corruption
---

# Runbook: Fix Next.js Type-Check Blocker

## Quick Fix (10 minutes)

```bash
cd /Users/dragon/cboteros/proyectos/intcloudsysops

# 1. Clean ALL .next caches
find apps -name ".next" -type d -delete

# 2. Rebuild workspaces sequentially
npm run build --workspace=@intcloudsysops/types
npm run build --workspace=@intcloudsysops/orchestrator
npm run build --workspace=@intcloudsysops/api
npm run build --workspace=@intcloudsysops/admin

# 3. Type-check
npm run type-check

# Expected: PASS (14/14 workspaces)
```

If still fails:

## Full Nuclear Option (20 minutes)

```bash
# 1. Clean node_modules + lockfile
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm package-lock.json

# 2. Reinstall
npm install

# 3. Rebuild (takes 5-10 min)
npm run build

# 4. Type-check
npm run type-check
```

---

## Understanding the Bug

**What's happening:**
- Next.js has a built-in route validator in `.next/types/validator.ts`
- It expects all `app/api/*/route.ts` files to be importable
- But we have routes in `apps/orchestrator` (not `apps/api`)
- Validator cached those routes and now expects them

**Why it persists:**
- Build cache persists `.next/` directory
- Cache references deleted/moved files
- Rebuild from cache doesn't fix stale references

**Root cause (for architecture):**
- Agent routes should live in **one place** (see ADR-028)
- Currently split between orchestrator + api spec
- Creates phantom routes in validator

---

## Permanent Fix (Requires ADR-028 Decision)

See `docs/adr/ADR-028-agent-api-routing.md` (TODO: create):

**Option A: Move agent routes to API**
- Pros: Type validator happy, single source of truth
- Cons: Orchestrator loses direct HTTP serving
- Time: 4-6 hours

**Option B: Exclude orchestrator from validator**
- Pros: Quick, no refactoring
- Cons: Validator loses coverage
- Time: 1 hour

**Option C: Remove phantom routes from spec**
- Pros: Minimal change
- Cons: Orchestrator routes won't be validated
- Time: 2 hours

---

## Verification

```bash
# Expect PASS
npm run type-check

# Expect green
npm run lint:check

# Expect all green
npm run validate-structure
```

---

## On VPS (if CI fails)

```bash
ssh -i ~/.ssh/opsly-vps vps-dragon@100.120.151.91

cd /opt/opsly
git pull origin main

find apps -name ".next" -type d -delete
npm install

# Then in docker-compose context
docker compose -f infra/docker-compose.platform.yml up --build api admin
```

---

## Escalation

If none of this works:

1. Check `npm list @types/next`
2. Check if `.next` is in `.gitignore` (should be)
3. Check if lockfile has stale references
4. Last resort: `git clean -fdx` (DANGEROUS, loses untracked files)

Contact @architect for ADR-028 decision.

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[brain/README|Brain Central]]
