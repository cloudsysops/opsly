# opsly-simplify: Docker & Docker Compose Optimization

## Overview

Systematic code simplification and optimization for opsly's Docker and docker-compose configuration. Identifies and fixes patterns that create maintenance burden, waste resources, or duplicate configuration.

**Git source:** `skills/user/opsly-simplify/SKILL.md`

---

## Phase 1: Identify Simplification Opportunities

### Dockerfile Patterns (Multi-Stage Builds)

**npm dependency management:**
- ✅ Use `npm ci` (deterministic) instead of `npm install`
- ✅ Add `--ignore-scripts` to skip postinstall scripts (unless needed; verify per package)
- ✅ Add `--omit=dev` in production images to exclude dev dependencies
- ⚠️ If runner stage needs node_modules, copy from builder stage — avoids reinstall

**Example pattern:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build -w @intcloudsysops/service-name

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/service-name/dist ./apps/service-name/dist
CMD ["node", "dist/src/server.js"]
```

**Checklist:**
- [ ] Runner stage copies node_modules from builder (not reinstalling)
- [ ] Unnecessary npm ci removed from runner stage
- [ ] Build cache layers ordered: package files → install → source → build

---

### docker-compose.platform.yml Patterns (YAML Anchors)

#### Healthcheck Anchor for Node Services

**Problem:** 9 Node services repeat identical healthcheck structure (interval, timeout, retries) with only the test command and start_period differing.

**Solution:** Create `x-healthcheck-node` anchor for shared properties:

```yaml
x-healthcheck-node: &healthcheck-node
  interval: 30s
  timeout: 10s
  retries: 3
```

**Usage in services:**
```yaml
app:
  healthcheck:
    <<: *healthcheck-node
    test: ["CMD", "node", "-e", "fetch('http://localhost:3000/health')"]
    start_period: 60s

admin:
  healthcheck:
    <<: *healthcheck-node
    test: ["CMD", "node", "-e", "fetch('http://localhost:3001/health')"]
    start_period: 45s
```

**Services using this pattern:** app, admin, portal, mcp, llm-gateway, ingestion-bunker, orchestrator, hermes, context-builder

#### Supabase Environment Anchor

**Problem:** orchestrator and hermes services repeat identical Supabase config with fallback logic:
```yaml
SUPABASE_URL: ${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}
SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-}
```

**Solution:** Create `x-env-supabase` anchor:

```yaml
x-env-supabase: &env-supabase
  SUPABASE_URL: ${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}
  NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:-}
  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-}
```

**Usage:**
```yaml
orchestrator:
  environment:
    <<: *env-supabase
    # other vars...

hermes:
  environment:
    <<: *env-supabase
    # other vars...
```

#### Resource Limits Verification

**All 17 services should have memory limits** to prevent OOM:
```yaml
deploy:
  resources:
    limits:
      memory: 512M  # or service-appropriate value
```

**Expected services and typical limits:**
| Service | Memory | Notes |
|---------|--------|-------|
| app | 768M | main API |
| admin | 512M | dashboard |
| portal | 512M | user portal |
| mcp | 256M | lightweight |
| llm-gateway | 1G | heavy compute |
| ingestion-bunker | 256M | queue consumer |
| orchestrator | 1G | workflow engine |
| hermes | 512M | job executor |
| context-builder | 512M | semantic processing |
| cadvisor | 256M | monitoring |
| redis | 384M | cache/queue backend |
| postgres | varies | check docs |
| prometheus | 512M | metrics |
| grafana | 256M | UI |
| traefik | 256M | router |
| uptime-kuma | 256M | monitoring |
| n8n | 512M | automation |

---

## Phase 2: Code Review Checklist

### For each Dockerfile in `apps/`:

- [ ] Multi-stage build uses `AS builder` and `AS runner` (or similar)
- [ ] Builder stage: `npm ci --ignore-scripts` (or `--ignore-scripts` if required)
- [ ] Builder stage: Production image only → add `--omit=dev`
- [ ] Runner stage: Copies only built artifacts, not entire repo
- [ ] Runner stage: Does NOT repeat npm install/ci
- [ ] Workdir and build commands appropriate for package structure

### For docker-compose.platform.yml:

- [ ] All Node services use `x-healthcheck-node` anchor or have documented exception
- [ ] Supabase-dependent services use `x-env-supabase` anchor
- [ ] All 17 services have `deploy.resources.limits.memory` set
- [ ] No hardcoded secrets (use `${VAR}` interpolation only)
- [ ] x-logging anchor applied consistently (confirmed working elsewhere)

---

## Phase 3: Implementation Steps

### For Dockerfiles:

1. Read the current Dockerfile
2. Identify if it's single-stage or multi-stage
3. Check `RUN npm` commands for `ci` vs `install`, `--ignore-scripts`, `--omit=dev`
4. If multi-stage and runner copies node_modules, verify builder populates it and runner doesn't reinstall
5. Apply fixes and test build

### For docker-compose.platform.yml:

1. Add anchors to top of file (after `version` and before services)
2. For each service matching the pattern:
   - If Node healthcheck: replace with `<<: *healthcheck-node` + service-specific test/start_period
   - If Supabase env: replace with `<<: *env-supabase` + other env vars
3. Verify resource limits exist (or add if missing)
4. Test: `docker-compose config` parses YAML correctly, `docker-compose up` starts services

---

## Known Patterns & Decisions

### When to use anchors:
- **Exact match:** interval=30s, timeout=10s, retries=3 for Node healthchecks → anchor
- **Fallback chains:** Supabase config with `${VAR:-${OTHER_VAR:-}}` → anchor
- **Repeated sections with variations:** healthcheck test, start_period vary; everything else identical → anchor

### When NOT to create anchors:
- Single occurrence (no duplication)
- Highly service-specific (will only be used once)
- Values diverge significantly across uses

### Resource limits notes:
- All 17 services already have limits in place (as of 2026-04-13)
- Limits prevent runaway memory consumption and kernel OOM killer
- Never exceed host available memory

### Healthcheck test commands:
- Node services: `node -e "fetch('http://localhost:PORT/health')"`
- Each service has unique PORT
- start_period varies: 15s (fast), 30s (normal), 45s+ (slow startup)
- Keep these service-specific; only anchor shared properties

---

## Files Modified (Session 2026-04-13)

- ✅ `/opt/opsly/apps/ingestion-service/Dockerfile` — npm ci --ignore-scripts --omit=dev
- ✅ `/opt/opsly/apps/llm-gateway/Dockerfile` — removed redundant npm ci from runner
- ✅ `/opt/opsly/infra/docker-compose.platform.yml` — added 2 anchors, applied to 9 services + 2 env services

---

## Remaining Optimizations (Lower Priority)

1. **Playwright in Hermes:** Removed from Dockerfile (commit d82ad3d). If jobs fail on first run, consider lazy-loading via `npx playwright install`.

2. **Orchestrator source bloat:** Copies full `/app/apps/ml` (~10-20MB). Verify if dist-only would work — could save build time.

3. **Context-builder repo files:** Bakes `/docs`, `AGENTS.md` into image. Could use volume mounts instead (~10-50MB savings per layer).

---

## Success Criteria

- All Node services in docker-compose use healthcheck anchor
- Supabase-dependent services use env anchor
- All 17 services have memory limits
- `docker-compose config` produces valid output
- Services start and pass health checks
- No duplicate configuration visible in YAML

---

## References

- **Main config:** `/opt/opsly/infra/docker-compose.platform.yml`
- **Node app patterns:** `/opt/opsly/apps/{api,admin,portal,mcp,llm-gateway,ingestion-service,orchestrator,hermes,context-builder}/Dockerfile`
- **Docker Compose docs:** https://docs.docker.com/compose/compose-file/compose-file-v3/
- **YAML anchors:** https://yaml.org/type/merge.html
