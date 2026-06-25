---
status: active
owner: operations
last_review: 2026-06-22
---

# VPS Validation Guide — Peskids Production

> Pre-deployment checklist for Peskids production environment

---

## 🎯 Objetivo

Validar que VPS `100.120.151.91` está **100% operativo** antes de Peskids go-live:
- SSH connectivity + Tailscale
- Docker runtime
- Opsly codebase
- Running services
- API health endpoints
- Monitoring (N8N, Uptime Kuma)

---

## 📋 Prerequisitos

### 1. Tailscale Connectivity

```bash
# Check Tailscale status
tailscale status

# You should see:
#   100.120.151.91    vps-dragon           linux
#   (and other nodes)
```

**If Tailscale not connected:**
```bash
# Linux/Mac
tailscale login

# Windows
# Settings → Tailscale → Log In

# Verify connection
ping 100.120.151.91
```

### 2. SSH Key Setup

```bash
# Check SSH key
ssh-keygen -l -f ~/.ssh/id_rsa

# Test SSH connection
ssh root@100.120.151.91 "echo 'SSH OK'"

# If fails, ensure key is in VPS ~/.ssh/authorized_keys
# or set up key-based auth first
```

### 3. Environment Variables (Optional but Recommended)

```bash
# Add to ~/.bashrc or ~/.zshrc for convenience
export VPS_HOST=100.120.151.91
export VPS_USER=root
export API_URL=https://api.op-sly.com

# Or pass per-command:
./scripts/peskids-orchestrator.sh --task validate-vps
```

---

## ✅ Quick Validation (Automated)

### Option 1: Use Orchestrator Script (Recommended)

```bash
cd /path/to/opsly
./scripts/peskids-orchestrator.sh --task validate-vps
```

**Output:**
```
[INFO] Validating VPS at root@100.120.151.91...
[✓] SSH connectivity OK
[✓] Docker available
[✓] Opsly directory exists
[INFO] Running services:
  app                up (docker-compose)
  postgres           up
  redis              up
  ...
[✓] API health check passed
[✓] Peskids health endpoints configured
```

### Option 2: Manual SSH Commands

```bash
# 1. Test SSH
ssh root@100.120.151.91 "echo 'SSH OK'"

# 2. Check Docker
ssh root@100.120.151.91 "docker --version && docker ps"

# 3. Check Opsly directory
ssh root@100.120.151.91 "ls -la /opt/opsly/apps/api/Dockerfile"

# 4. Check running services
ssh root@100.120.151.91 "cd /opt/opsly && docker-compose ps"

# 5. Check API health
curl https://api.op-sly.com/api/health

# 6. Check Peskids endpoint
curl https://api.op-sly.com/api/portal/health?slug=peskids | jq .
```

---

## 🔍 Detailed Validation Steps

### Step 1: SSH & System Check

```bash
ssh root@100.120.151.91

# Once connected, verify system
uname -a
# Linux vps-dragon 6.x.x ...

df -h /opt
# Check disk space

docker --version
# Docker version X.Y.Z

docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Step 2: Opsly Codebase

```bash
ssh root@100.120.151.91 "cd /opt/opsly && git log --oneline -5"

# Output should show recent commits
# If not on main, run: git checkout main && git pull --ff-only

# Check if Dockerfile present
ls -la /opt/opsly/apps/api/Dockerfile
```

### Step 3: Docker Images

```bash
ssh root@100.120.151.91 "docker images | grep intcloudsysops"

# Should show:
# intcloudsysops-api    peskids-latest    ...
# intcloudsysops-api    latest            ...
```

### Step 4: Running Services

```bash
ssh root@100.120.151.91 "cd /opt/opsly && docker-compose ps"

# Check these containers:
# - app (or api) — API service
# - postgres — Database
# - redis — Cache
# - traefik — Reverse proxy
```

### Step 5: API Health

```bash
# From local machine
curl -v https://api.op-sly.com/api/health

# Expected response:
# HTTP/2 200
# {"status":"ok","timestamp":"2026-06-22T..."}
```

### Step 6: Peskids-Specific Endpoints

```bash
# Portal health
curl https://api.op-sly.com/api/portal/health?slug=peskids | jq .

# Should return:
# {
#   "status": "healthy",
#   "endpoints": {
#     "n8n_peskids": "https://n8n-peskids.op-sly.com",
#     "uptime_peskids": "https://uptime-peskids.op-sly.com"
#   }
# }

# Landing page
curl https://peskids.op-sly.com | head -20
# Should contain HTML with Peskids branding
```

### Step 7: Monitoring Services

```bash
# Check N8N is accessible
curl https://n8n-peskids.op-sly.com

# Check Uptime Kuma is accessible
curl https://uptime-peskids.op-sly.com
```

---

## 🔧 Common Issues & Fixes

### Issue: SSH Connection Refused

**Symptom:** `ssh: connect to host 100.120.151.91 port 22: Connection refused`

**Fix:**
1. Check Tailscale: `tailscale status`
2. Verify VPS is running: `ssh root@100.120.151.91` from another machine
3. Check firewall: `sudo iptables -L` on VPS

---

### Issue: Docker Not Found

**Symptom:** `docker: command not found`

**Fix:**
```bash
ssh root@100.120.151.91
curl -fsSL https://get.docker.com | sh
systemctl start docker
```

---

### Issue: Opsly Directory Missing

**Symptom:** `/opt/opsly` not found

**Fix:**
```bash
ssh root@100.120.151.91
cd /opt
git clone https://github.com/cloudsysops/opsly.git
cd opsly
docker-compose up -d
```

---

### Issue: API Returns 503 / Service Unavailable

**Symptom:** `curl https://api.op-sly.com/api/health` returns 503

**Fix:**
```bash
# Check logs
ssh root@100.120.151.91 "cd /opt/opsly && docker-compose logs -f app"

# Restart services
ssh root@100.120.151.91 "cd /opt/opsly && docker-compose restart app"

# Wait for startup (30-60s)
sleep 30
curl https://api.op-sly.com/api/health
```

---

### Issue: Peskids Endpoint Returns 404

**Symptom:** `/api/portal/health?slug=peskids` returns 404

**Fix:**
1. Check if Peskids is configured in database
2. Run migration: `docker-compose exec postgres psql -U postgres -d platform -c "SELECT slug FROM tenants WHERE slug='peskids';"`
3. If missing, seed: `./scripts/seed-peskids-demo-class.sh`

---

## 📊 Health Check Checklist

| Component | Check | Status | Notes |
|-----------|-------|--------|-------|
| **SSH** | `ssh root@100.120.151.91 "echo OK"` | ✅ | Requires Tailscale |
| **Docker** | `docker --version` | ✅ | Running daemon |
| **Codebase** | `/opt/opsly` exists | ✅ | Git on main |
| **Images** | `intcloudsysops-api:peskids-latest` | ✅ | Built recently |
| **Services** | `docker-compose ps` shows all running | ✅ | Postgres + Redis + App + Traefik |
| **API** | `GET /api/health` → 200 | ✅ | JSON response |
| **Portal** | `GET /api/portal/health?slug=peskids` → 200 | ✅ | N8N + Uptime endpoints |
| **Landing** | `GET https://peskids.op-sly.com` → 200 | ✅ | HTML content |
| **N8N** | `GET https://n8n-peskids.op-sly.com` → accessible | ✅ | Admin login works |
| **Uptime** | `GET https://uptime-peskids.op-sly.com` → accessible | ✅ | Dashboard loads |

---

## 🚀 Post-Validation Steps

### If All Checks Pass ✅

```bash
# 1. Run comprehensive health check
./scripts/peskids-orchestrator.sh --task health-check

# 2. Run smoke tests
./scripts/peskids-orchestrator.sh --task smoke-test

# 3. Log results for documentation
# Update docs/OPTIMIZATION-ROADMAP-2026-06.md with timestamp
```

### If Any Check Fails ❌

```bash
# 1. Collect diagnostics
ssh root@100.120.151.91 "docker-compose logs --tail=100 app" > /tmp/docker-logs.txt
ssh root@100.120.151.91 "docker ps" > /tmp/docker-ps.txt
ssh root@100.120.151.91 "systemctl status docker" > /tmp/docker-status.txt

# 2. Review logs
cat /tmp/docker-logs.txt

# 3. Escalate with diagnostics (post in #ops channel)
```

---

## 📱 Automated Daily Health Check (Optional)

Add cron job on VPS for automated monitoring:

```bash
# SSH to VPS
ssh root@100.120.151.91

# Edit crontab
crontab -e

# Add line (runs every 6 hours)
0 0,6,12,18 * * * curl -s https://api.op-sly.com/api/health | logger -t peskids-health

# Verify
crontab -l
```

---

## 🔗 Related Documentation

- [`docs/OPTIMIZATION-ROADMAP-2026-06.md`](OPTIMIZATION-ROADMAP-2026-06.md) — Deployment timeline
- [`docs/tenants/peskids/EXTRACTION-PLAN.md`](../tenants/peskids/EXTRACTION-PLAN.md) — Long-term roadmap
- [`scripts/peskids-orchestrator.sh`](../scripts/peskids-orchestrator.sh) — Automated validation
- [`docs/01-development/VISION.md`](01-development/VISION.md) — Product strategy

---

*Last updated: 2026-06-22 by Claude (claude-haiku-4-5-20251001)*
