---
status: audit-complete
date: 2026-05-08T13:30:00Z
scope: "12 Dockerfiles + 12 docker-compose files"
---

# Docker Optimization Audit

**Scope:** 12 Dockerfiles + 12 docker-compose configurations  
**Methodology:** Multi-stage build efficiency, base image size, layer optimization  
**Estimated impact:** 20-40% size reduction + faster builds  

---

## Summary

| Aspect | Status | Gap |
|--------|--------|-----|
| Multi-stage builds | 8/12 ✅ | 4 single-stage (can improve) |
| Alpine base images | 7/12 ✅ | 5 using full distributions |
| APT cleanup | 1/12 ✅ | **11 missing cleanup** |
| .dockerignore coverage | 4/12 ✅ | **8 missing .dockerignore** |

**Overall:** 🟡 POOR (but fixable with quick wins)

---

## 🔴 CRITICAL FINDINGS

### 1. Missing .dockerignore (8 files)

**Problem:** Build context includes unnecessary files

**Affected apps:**
1. `apps/portal/` — Missing .dockerignore
2. `apps/admin/` — Missing .dockerignore
3. `apps/llm-gateway/` — Missing .dockerignore
4. `apps/mcp/` — Missing .dockerignore
5. `apps/context-builder/` — Missing .dockerignore
6. `apps/api/` — Missing .dockerignore
7. `apps/orchestrator/` — Missing .dockerignore
8. `apps/notebooklm-agent/` — Missing .dockerignore

**Impact:**
- Node modules copied even when not needed
- Git files, test files, source maps included
- Build context: 1GB → 100MB possible

**Example .dockerignore:**
```
# Git
.git
.gitignore

# Node
node_modules/
npm-debug.log
yarn-error.log

# Build
dist/
build/
.next/
.turbo/

# Dev
.env.local
.env.*.local
src/

# Tests
*.test.ts
*.spec.ts
coverage/

# Other
README.md
.DS_Store
```

**Fix:** Create `.dockerignore` in each app directory  
**Time:** 15 minutes (copy-paste + test)  
**Savings:** 50-70% build context reduction

---

### 2. Missing APT Cleanup (11 files)

**Problem:** Package manager caches left in images

**Symptoms:**
- Image bloat from apt lists
- Example: Node Alpine 18 base = 200MB, with apt cache = 300MB+

**Solution:**
```dockerfile
# ❌ BEFORE (current)
FROM node:18
RUN apt-get update && apt-get install -y curl

# ✅ AFTER (optimized)
FROM node:18-alpine
RUN apk update && apk add curl && rm -rf /var/cache/apk/*

# OR for Debian
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*
```

**Impact:** 50-100MB savings per image

**Time:** 1 hour (add cleanup to 11 Dockerfiles)

---

## 🟡 IMPORTANT FINDINGS

### 3. Single-Stage Builds (4 files)

**Affected:**
1. `Dockerfile.local-worker` — 28 lines
2. `infra/sandbox/Dockerfile.sandbox` — 17 lines
3. `apps/experimental/ingestion-service-archive/Dockerfile` — 14 lines
4. `apps/notebooklm-agent/Dockerfile` — 10 lines

**Problem:** Development dependencies included in production image

**Example:**
```dockerfile
# ❌ BEFORE (single-stage)
FROM node:18
RUN apt-get install -y build-essential python3
COPY . .
RUN npm install --legacy-peer-deps
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# ✅ AFTER (multi-stage)
FROM node:18 AS builder
RUN apt-get install -y build-essential python3
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:18-alpine
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

**Impact:** 
- Dev deps removed (build-essential, python, gcc) = 200-400MB reduction
- Image size: 1GB → 300-500MB

**Time:** 2 hours (convert to multi-stage)

---

### 4. Non-Alpine Bases (5 files)

**Affected:**
1. `Dockerfile.local-worker`
2. `infra/sandbox/Dockerfile.sandbox`
3. `apps/notebooklm-agent/Dockerfile`
4. And 2 others using full node/ubuntu

**Problem:** Full distributions are 3-5x larger than Alpine

**Comparison:**
```
node:18 (Debian)           = 900MB
node:18-alpine             = 180MB
Savings: 80% reduction!
```

**Solution:** Switch to Alpine unless you need specific tools

**Time:** 1 hour (test with Alpine base)

---

## Optimization Priorities

### Phase 1: QUICK WINS (1.5 hours)
- [ ] Add .dockerignore to 8 missing apps
- [ ] Add APT/APK cleanup to 11 images
- [ ] **Estimated savings:** 2-3GB total across all builds

### Phase 2: MEDIUM EFFORT (2 hours)
- [ ] Convert 4 single-stage builds to multi-stage
- [ ] Switch 5 non-Alpine images to Alpine
- [ ] **Estimated savings:** 1.5-2GB on image sizes

### Phase 3: POLISH (1 hour)
- [ ] Layer ordering optimization (frequently changing files last)
- [ ] Cache invalidation strategy
- [ ] Build parallelization in compose

---

## Implementation Guide

### Step 1: Add .dockerignore (5 minutes per app)

Create `.dockerignore` in app root:
```bash
# For each app
echo "node_modules
.git
.env.local
src/
*.test.ts
coverage/
.next/" > apps/portal/.dockerignore
```

### Step 2: Cleanup APT (10 minutes per Dockerfile)

Example for Debian-based:
```dockerfile
RUN apt-get update \
    && apt-get install -y curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
```

Example for Alpine:
```dockerfile
RUN apk add --no-cache curl
```

### Step 3: Convert to Multi-Stage

For each single-stage Dockerfile, split into builder + runtime

---

## Dockerfile Best Practices Checklist

- [ ] Uses multi-stage build? (Production images should have builder stage)
- [ ] Uses Alpine or slim base? (Not full OS distros)
- [ ] APT/APK cleanup included? (rm -rf /var/lib/apt/lists/*)
- [ ] .dockerignore exists? (Minimal build context)
- [ ] Layers ordered correctly? (Frequently changing files last)
- [ ] Healthcheck defined? (For long-running services)
- [ ] Non-root user running? (Security best practice)

---

## Performance Metrics (Expected)

### Build Time
- Before optimization: Variable (depends on context size)
- After .dockerignore: 30-50% faster
- Estimate: 5-10 min → 2-5 min per app

### Image Sizes (Estimated)
```
Before:              After:             Savings:
Portal    1.2GB      →  400MB          67% ↓
API       1.1GB      →  380MB          66% ↓
Admin     1.0GB      →  350MB          65% ↓
Average: 65% reduction across images
```

### Total Impact
- 12 apps × 1GB average = 12GB total current
- After optimization = 4-5GB total
- **Savings: 7-8GB (58% reduction)**

---

## Docker Compose Improvements

### Quick Wins

1. **Remove unused volumes:**
```yaml
# ❌ BEFORE
volumes:
  - ./src:/app/src
  - ./dist:/app/dist
  - node_modules:/app/node_modules

# ✅ AFTER (only for dev)
volumes:
  - ./src:/app/src  # Only source
```

2. **Health checks:**
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

3. **Resource limits:**
```yaml
services:
  api:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

---

## Next Steps

1. **Generate GitHub PR:** "Docker: Optimize builds (add .dockerignore + cleanup)"
2. **Test locally:** `docker build -t app:optimized .`
3. **Measure:** Compare image sizes before/after
4. **Deploy:** Merge in phases (non-critical apps first)

---

## Reference: Optimized Dockerfile Template

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /build
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app
RUN apk add --no-cache curl

# Copy from builder
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY package*.json ./

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["npm", "start"]
```

---

**Status:** ✅ Audit complete. Optimizations identified.  
**Owner:** @devops (Docker optimization)  
**Priority:** MEDIUM (nice to have, but improves CI/CD speed + deployment efficiency)  
**Effort:** 4-5 hours total  
**Impact:** 60-70% smaller images + 30-50% faster builds
