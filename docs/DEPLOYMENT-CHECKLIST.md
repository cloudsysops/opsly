# Phase 8: VPS Deployment + Production Testing Checklist

**Scope:** Deploy Phases 5-7 (Orchestrator, Agent Teams, Validation) to production VPS (100.120.151.91)

**Target Environment:** VPS Docker containers with zero-downtime deployment

**Estimated Duration:** 15-20 minutes

---

## Pre-Deployment Phase (Mandatory)

### Code Review & Quality Gates

- [ ] **All PR reviews completed** — Code review checklist passed for all Phase 5-7 changes
  - [ ] Architectural decisions documented in ADRs
  - [ ] No security issues flagged in secret scanning
  - [ ] No `any` types in TypeScript (type-check passing)

- [ ] **Type Safety Verification**

  ```bash
  npm run type-check
  ```

  - [ ] No TypeScript errors
  - [ ] All interfaces properly typed
  - [ ] No implicit `any` values

- [ ] **Linting & Formatting**

  ```bash
  npm run lint
  npm run format:check
  ```

  - [ ] No linting errors
  - [ ] Code properly formatted
  - [ ] ESLint rules satisfied

- [ ] **Unit & Integration Tests Pass**

  ```bash
  npm run test -- --run
  ```

  - [ ] Test suite completes with 0 failures
  - [ ] Coverage metrics acceptable (>70% for critical paths)
  - [ ] No flaky tests

- [ ] **Dependency Security Audit**
  ```bash
  npm audit
  ```

  - [ ] No high/critical vulnerabilities
  - [ ] All transitive dependencies resolved
  - [ ] Dependency tree clean

### Git Preparation

- [ ] **Current Branch Clean**

  ```bash
  git status
  ```

  - [ ] No uncommitted changes
  - [ ] All work committed with descriptive messages

- [ ] **Branch Up-to-Date**

  ```bash
  git fetch origin main
  git log --oneline -10
  ```

  - [ ] Branch contains all necessary commits
  - [ ] No merge conflicts with main
  - [ ] Commit history is clean (no fixup commits)

- [ ] **Tag Creation (Optional but Recommended)**
  ```bash
  git tag -a v8.0.0-phases-5-7 -m "Phase 8 deployment: Orchestrator, Agent Teams, Validation"
  git push origin v8.0.0-phases-5-7
  ```

  - [ ] Version tag created and pushed
  - [ ] Release notes in GitHub

### Infrastructure Readiness

- [ ] **VPS SSH Access Verified**

  ```bash
  npm run opsly:vps-ssh:verify
  ```

  - [ ] Can SSH to VPS without password (Tailscale key-based auth)
  - [ ] SSH agent forwarding working if needed

- [ ] **VPS Docker Runtime Healthy**

  ```bash
  ssh vps-dragon@100.120.151.91 "docker ps --format 'table {{.Names}}\t{{.Status}}'"
  ```

  - [ ] Docker daemon responsive
  - [ ] Previous containers healthy or acceptable to restart

- [ ] **Disk Space Available on VPS**

  ```bash
  ssh vps-dragon@100.120.151.91 "df -h /"
  ```

  - [ ] At least 10GB free space
  - [ ] No inode exhaustion warnings

- [ ] **Environment Variables Set in Doppler**
  ```bash
  doppler run --project ops-intcloudsysops --config prd -- env | grep -E "ORCHESTRATOR|AGENT|VALIDATION"
  ```

  - [ ] `ORCHESTRATOR_MODE` set correctly
  - [ ] `AGENT_TEAM_SIZE` configured
  - [ ] `VALIDATION_ESCALATION_THRESHOLD` set
  - [ ] All required secrets present

---

## Deployment Phase

### Step 1: Pre-Deployment Health Check (5 min)

- [ ] **Local docker-compose validation**

  ```bash
  docker-compose -f infra/docker-compose.local.yml config > /dev/null
  ```

  - [ ] YAML syntax valid
  - [ ] All services defined
  - [ ] All volume mounts accessible

- [ ] **Environment file integrity**
  ```bash
  test -f .env && wc -l .env
  ```

  - [ ] `.env` file exists (if using local env)
  - [ ] All required variables populated

### Step 2: Execute Deployment Script (10 min)

```bash
./scripts/deploy-phases-5-7.sh \
  --vps-host 100.120.151.91 \
  --vps-user vps-dragon
```

The script performs:

- [ ] **Git sync on VPS**
  - [ ] Fetches origin/main
  - [ ] Merges latest code
  - [ ] Logs show clean merge

- [ ] **Full npm build**
  - [ ] `npm ci` completes (installs exact versions)
  - [ ] `npm run build` succeeds for all workspaces
  - [ ] No build errors in build log

- [ ] **Docker graceful shutdown**
  - [ ] Running containers stopped within 30s timeout
  - [ ] No forced kills (should use SIGTERM → SIGKILL)
  - [ ] Orphaned containers removed

- [ ] **Docker services started**
  - [ ] `docker compose up -d` succeeds
  - [ ] All defined services in RUNNING state
  - [ ] No container restarts in first 30s

### Step 3: Health Check Loop (2 min)

Script runs health checks every 10s for up to 2 minutes:

- [ ] **Orchestrator (port 3011)**

  ```bash
  curl -sf http://localhost:3011/health
  ```

  - [ ] Returns 200 OK
  - [ ] JSON response includes `"status":"healthy"`
  - [ ] No 5xx errors

- [ ] **API Service (port 3000)**

  ```bash
  curl -sf http://localhost:3000/api/health
  ```

  - [ ] Returns 200 OK
  - [ ] Includes database connectivity status
  - [ ] Queue connection established

- [ ] **Admin Dashboard (port 3001)**
  ```bash
  curl -sf http://localhost:3001/health
  ```

  - [ ] Returns 200 OK
  - [ ] React app loads successfully
  - [ ] Static assets served

### Step 4: Background Service Startup (1 min)

- [ ] **Orchestrator Watchdog Started**

  ```bash
  ssh vps-dragon@100.120.151.91 "ps aux | grep watchdog"
  ```

  - [ ] Process running as expected
  - [ ] Logs writing to `/var/log/opsly-watchdog.log`
  - [ ] No startup errors

- [ ] **Agent Trainer Service Started**
  ```bash
  ssh vps-dragon@100.120.151.91 "ps aux | grep trainer"
  ```

  - [ ] Process running
  - [ ] Logs writing to `/var/log/opsly-trainer.log`
  - [ ] Connecting to orchestrator successfully

---

## Post-Deployment Validation Phase

### Container Health Verification

```bash
ssh vps-dragon@100.120.151.91 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

- [ ] **All critical containers running:**
  - [ ] `traefik` - reverse proxy
  - [ ] `redis` - queue backend
  - [ ] `api` - main API service
  - [ ] `admin` - admin dashboard
  - [ ] `orchestrator` - job orchestrator
  - [ ] `llm-gateway` - LLM proxy

- [ ] **No unhealthy containers:**
  - [ ] Status does NOT show `(unhealthy)`
  - [ ] Status does NOT show `Restarting`
  - [ ] Status should be `Up X seconds` or similar

### Service Connectivity

- [ ] **Queue connections healthy**

  ```bash
  ssh vps-dragon@100.120.151.91 "redis-cli ping"
  ```

  - [ ] Returns `PONG`
  - [ ] Redis accepting connections

- [ ] **Database connectivity**
  - [ ] Orchestrator can connect to Supabase
  - [ ] No connection timeout errors in logs
  - [ ] Migrations applied successfully

- [ ] **Inter-service communication**
  - [ ] API can reach orchestrator
  - [ ] Orchestrator can reach LLM gateway
  - [ ] All HTTP calls use correct ports

### Test Prompt Execution & Validation Cycle

```bash
./scripts/production-smoke-tests.sh
```

- [ ] **Test prompts created**
  - [ ] `.cursor/prompts/prod-test-1.md` exists
  - [ ] `.cursor/prompts/prod-test-2.md` exists
  - [ ] `.cursor/prompts/prod-test-3.md` exists

- [ ] **Execution cycle working**
  - [ ] Agent receives prompt via orchestrator
  - [ ] Agent generates response
  - [ ] Validation runs on response
  - [ ] Iteration loop completes (3-5 iterations expected)

- [ ] **Git auto-commit working**
  - [ ] Changes committed automatically after validation
  - [ ] Commit messages clear and descriptive
  - [ ] Branch is clean (no uncommitted changes)

- [ ] **Validation metrics acceptable**
  - [ ] Improvement percentage tracked
  - [ ] Escalation rate < 10% (warning threshold)
  - [ ] Average cycle time < 500ms
  - [ ] Success rate > 95%

### Queue Processing Verification

- [ ] **BullMQ jobs processing**

  ```bash
  ssh vps-dragon@100.120.151.91 \
    "redis-cli --raw LRANGE bull:orchestrator:jobs:* 0 -1 | head -10"
  ```

  - [ ] Job queue has items
  - [ ] Jobs transitioning from pending → active → completed
  - [ ] No stuck jobs (in active state > 5 minutes)

- [ ] **Dead Letter Queue (DLQ) empty**
  ```bash
  ssh vps-dragon@100.120.151.91 "redis-cli --raw LRANGE bull:orchestrator:failed:* 0 -1"
  ```

  - [ ] DLQ should be empty or minimal
  - [ ] If failures exist, they're expected/handled

### Discord Notifications

- [ ] **Discord channel receiving alerts**
  - [ ] Check `#opsly-deployments` channel
  - [ ] Deployment started notification received
  - [ ] Deployment completed notification received
  - [ ] No error/critical alerts (should be all green)

- [ ] **Watchdog alerts functional**
  - [ ] Watchdog alert format correct
  - [ ] Escalation rate and timing metrics included
  - [ ] Color coding (green/yellow/red) appropriate

### Log Analysis

- [ ] **No critical errors in logs**

  ```bash
  ssh vps-dragon@100.120.151.91 "tail -100 /var/log/opsly-watchdog.log | grep -i error"
  ```

  - [ ] Should return minimal errors (<2% of log lines)
  - [ ] Warnings are acceptable; errors should be addressed

- [ ] **Agent trainer learning**

  ```bash
  ssh vps-dragon@100.120.151.91 "tail -100 /var/log/opsly-trainer.log"
  ```

  - [ ] Trainer is processing feedback
  - [ ] Improvement metrics logged
  - [ ] No trainer crashes

- [ ] **Orchestrator performance**
  ```bash
  ssh vps-dragon@100.120.151.91 "curl -sf http://localhost:3011/health | jq '.metrics'"
  ```

  - [ ] Avg validation time reasonable
  - [ ] Throughput stable
  - [ ] No memory leaks (process doesn't grow)

### Test Results Artifact

- [ ] **test-results.json generated**
  ```bash
  jq . test-results.json
  ```

  - [ ] All test prompts have pass/fail status
  - [ ] Success criteria met
  - [ ] Timestamps recorded for audit trail

---

## Rollback Procedures (If Needed)

### Quick Rollback (Last 5 minutes)

```bash
ssh vps-dragon@100.120.151.91 << 'EOF'
cd /opt/opsly
docker compose -f infra/docker-compose.platform.yml down
git reset --hard HEAD~1
npm ci && npm run build
docker compose -f infra/docker-compose.platform.yml up -d
EOF
```

- [ ] **Services restarted**
- [ ] **Health checks passing**
- [ ] **Incident reported in #opsly-incidents**

### Full Rollback (Using Git Tag)

If you created a git tag before deployment:

```bash
ssh vps-dragon@100.120.151.91 << 'EOF'
cd /opt/opsly
docker compose -f infra/docker-compose.platform.yml down
git checkout v7.0.0-stable  # Previous stable tag
npm ci && npm run build
docker compose -f infra/docker-compose.platform.yml up -d
EOF
```

- [ ] **Reverted to previous stable version**
- [ ] **All health checks passing with previous version**
- [ ] **Rollback reason documented**

---

## Post-Deployment Sign-Off

### Success Criteria

- [ ] All containers running and healthy
- [ ] Health endpoints responding 200 OK
- [ ] Test prompts execute successfully (3+ iterations)
- [ ] Git commits clean and traceable
- [ ] Discord notifications received
- [ ] Error rate < 2%
- [ ] No escalations to manual review (or <10%)

### Sign-Off

- [ ] **Deployed by:** `_________` (Name)
- [ ] **Date/Time:** `_________` (UTC timestamp)
- [ ] **Deployment ID/Tag:** `_________` (Git tag or commit)
- [ ] **VPS Verification:** `_________` (Health check results)
- [ ] **Stakeholder Approval:** `_________` (Optional, if required by policy)

---

## Monitoring & On-Call

### Immediate Monitoring (First Hour)

```bash
# Monitor container health
watch -n 5 'docker ps --format "table {{.Names}}\t{{.Status}}"'

# Monitor metrics
watch -n 5 'curl -sf http://localhost:3011/health | jq .'

# Monitor logs
tail -f /var/log/opsly-watchdog.log
tail -f /var/log/opsly-trainer.log
```

- [ ] **First 15 minutes:** No unexpected container restarts
- [ ] **First hour:** Error rate stable and < 2%
- [ ] **First 4 hours:** No memory leaks or resource exhaustion

### Ongoing Monitoring

- [ ] **Dashboard:** https://monitoring.ops.smiletripcare.com (Grafana)
- [ ] **Logs:** https://logs.ops.smiletripcare.com (Loki or equivalent)
- [ ] **Alerts:** Slack #opsly-alerts or Discord #opsly-monitoring
- [ ] **On-call:** Check rotation in Pagerduty/Opsgenie

### Known Issues & Workarounds

| Issue     | Symptom               | Workaround                | Status                      |
| --------- | --------------------- | ------------------------- | --------------------------- |
| (Example) | Trainer slow to start | Wait 30s, then check logs | Document actual issues here |
|           |                       |                           |                             |

---

## Appendix: Commands Reference

### Local Pre-Deployment

```bash
# Type check
npm run type-check

# Tests
npm run test -- --run

# Linting
npm run lint

# Verify git
git status
git log --oneline -10
```

### VPS Deployment

```bash
# Deploy everything
./scripts/deploy-phases-5-7.sh

# Deploy without rebuild
./scripts/deploy-phases-5-7.sh --no-build

# Dry-run (show what would happen)
./scripts/deploy-phases-5-7.sh --dry-run

# Custom VPS
./scripts/deploy-phases-5-7.sh --vps-host 192.168.1.100 --vps-user ubuntu
```

### VPS Verification

```bash
# SSH to VPS
ssh vps-dragon@100.120.151.91

# Check containers
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

# Check health
curl http://localhost:3011/health
curl http://localhost:3000/api/health
curl http://localhost:3001/health

# View logs
tail -f /var/log/opsly-watchdog.log
tail -f /var/log/opsly-trainer.log

# Redis queue status
redis-cli LLEN bull:orchestrator:jobs:
redis-cli LLEN bull:orchestrator:failed:

# Docker stats
docker stats
```

### Rollback

```bash
# Quick rollback
./scripts/deploy/rollback.sh

# Full rollback to previous tag
git checkout v7.0.0-stable
npm ci && npm run build
docker compose -f infra/docker-compose.platform.yml down
docker compose -f infra/docker-compose.platform.yml up -d
```

---

**Last Updated:** 2026-05-05  
**Maintained By:** Infrastructure Team  
**Contact:** #opsly-infrastructure on Discord
