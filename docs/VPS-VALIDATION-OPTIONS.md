---
status: active
owner: operations
last_review: 2026-06-22
---

# VPS Validation — Execution Options

> How to validate Peskids production readiness

---

## 🎯 3 Validation Approaches

### Option A: Automated Script (Recommended)

**What:** Run `peskids-orchestrator.sh` with SSH access  
**When:** Ready to validate + deploy  
**Prerequisites:** SSH configured, Tailscale connected

```bash
# Validate VPS before deploy
./scripts/peskids-orchestrator.sh --task validate-vps

# Or with environment variables
VPS_HOST=100.120.151.91 \
VPS_USER=root \
API_URL=https://api.op-sly.com \
./scripts/peskids-orchestrator.sh --task validate-vps
```

**Pros:**
- ✅ Fully automated
- ✅ Consolidates all checks (SSH, Docker, services, API, endpoints)
- ✅ Color-coded output (easy to read)
- ✅ Can be run repeatedly
- ✅ No manual shell commands

**Cons:**
- ❌ Requires SSH access to VPS
- ❌ Requires `bash`, `curl`, `ssh` installed locally

**Output Example:**
```
[INFO] Validating VPS at root@100.120.151.91...
[✓] SSH connectivity OK
[✓] Docker available
[✓] Opsly directory exists
[INFO] Running services:
  app                up (docker-compose)
  postgres           up
  redis              up
[✓] API health check passed
[✓] Peskids health endpoints configured
```

---

### Option B: HTTP Health Checks Only (No SSH)

**What:** Hit endpoints from local machine without SSH  
**When:** SSH not yet configured but VPS is running  
**Prerequisites:** VPS already deployed, API accessible

```bash
# Quick health check
./scripts/peskids-orchestrator.sh --task health-check

# Or manual curl
curl https://api.op-sly.com/api/health
curl https://api.op-sly.com/api/portal/health?slug=peskids
curl https://peskids.op-sly.com
curl https://n8n-peskids.op-sly.com
curl https://uptime-peskids.op-sly.com
```

**Pros:**
- ✅ No SSH required
- ✅ Works from anywhere
- ✅ Quick (30-60 seconds)
- ✅ Can be automated in GitHub Actions / CI

**Cons:**
- ❌ Doesn't check internal services (Docker, codebase status)
- ❌ Can't debug if API is down (can't see logs)
- ❌ Requires endpoints to be publicly accessible

**Use Case:** Monitoring after deployment, CI/CD validation

---

### Option C: GitHub CLI + SSH Runner (Decoupled)

**What:** Trigger validation via GitHub Actions, agent runs on VPS  
**When:** Want to automate in CI/CD without exposing SSH credentials  
**Prerequisites:** GitHub Actions self-hosted runner on VPS (optional)

```bash
# Create GitHub Actions workflow
gh workflow view peskids-validation

# Trigger validation workflow
gh workflow run peskids-validation.yml

# Check status
gh run list --workflow peskids-validation.yml
```

**Workflow File Example:** `.github/workflows/peskids-validation.yml`
```yaml
name: Peskids Validation

on:
  workflow_dispatch:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate VPS
        run: ./scripts/peskids-orchestrator.sh --task validate-vps
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_USER: ${{ secrets.VPS_USER }}
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
```

**Pros:**
- ✅ Fully automated in CI/CD
- ✅ Runs on schedule (e.g., every 6 hours)
- ✅ Results visible in GitHub (Actions tab)
- ✅ Secrets not exposed locally
- ✅ Easy to add to PR checks

**Cons:**
- ❌ Requires GitHub Actions setup
- ❌ More complex to configure
- ❌ SSH key as GitHub secret (security consideration)

**Use Case:** Continuous validation post-deployment

---

## 📊 Comparison Matrix

| Factor | Option A (SSH Script) | Option B (HTTP Only) | Option C (GH Actions) |
|--------|----------------------|----------------------|----------------------|
| **SSH Required** | ✅ Yes | ❌ No | ✅ Yes |
| **Effort to Setup** | 🟢 2min | 🟢 1min | 🟡 15min |
| **Automation Level** | 🟡 Semi | 🟡 Semi | 🟢 Full |
| **Can Debug Failures** | ✅ Yes (logs) | ❌ No | ✅ Yes (runner logs) |
| **CI/CD Integration** | 🟡 Manual | ✅ Easy | ✅ Built-in |
| **Runs Periodically** | ❌ No | ❌ No (need cron) | ✅ Yes (schedule) |
| **Cost** | 🟢 Free | 🟢 Free | 🟢 Free (if no runner) |

---

## 🚀 Recommended Flow

### Week of Jun 22 (Optimization Phase)

```
├─ Mon (Jun 22): SSH configured ✓
│  └─ Run Option A: ./scripts/peskids-orchestrator.sh --task validate-vps
│     └─ If ✅ PASS → proceed to deploy
│     └─ If ❌ FAIL → debug with VPS-VALIDATION-GUIDE.md
│
├─ Tue-Wed (Jun 23-24): Deployment + Setup
│  └─ Run Option A again: ./scripts/peskids-orchestrator.sh --task deploy-vps
│  └─ Run Option A: ./scripts/peskids-orchestrator.sh --task setup-n8n
│  └─ Run Option A: ./scripts/peskids-orchestrator.sh --task setup-uptime
│
├─ Thu (Jun 25): Health Check
│  └─ Run Option B: ./scripts/peskids-orchestrator.sh --task health-check
│  └─ Run Option A: ./scripts/peskids-orchestrator.sh --task smoke-test
│
└─ Fri (Jun 26): Post-Deployment
   └─ Set up Option C (GH Actions) for continuous monitoring
   └─ Document results in OPTIMIZATION-ROADMAP-2026-06.md
```

---

## 🔐 Security Considerations

### SSH Credentials
- **Never** commit SSH private keys to GitHub
- **Use** GitHub Secrets for SSH_PRIVATE_KEY in Actions
- **Restrict** SSH access via Tailscale (not internet-exposed)
- **Rotate** keys periodically

### API Endpoints
- `/api/health` — public (no auth required)
- `/api/portal/health?slug=peskids` — public (no auth required)
- Other `/api/portal/` routes — require Bearer token

### VPS Access
- **Only** access via Tailscale (VPN)
- **Verify** SSH key fingerprint before first connection
- **Monitor** SSH logs: `grep SSH /var/log/auth.log`

---

## 📋 Decision: Which Option Should You Use?

**Choose Option A if:**
- ✅ SSH access to VPS is ready (Tailscale configured)
- ✅ Want full visibility into internal services
- ✅ Need to debug failures with logs
- ✅ Planning to deploy or rebuild VPS

**Choose Option B if:**
- ✅ SSH not configured yet but API already running
- ✅ Want quick health check (< 1 min)
- ✅ Using for CI/CD monitoring (runs frequently)
- ✅ Troubleshooting external connectivity

**Choose Option C if:**
- ✅ Want fully automated, scheduled validation
- ✅ Integrating with GitHub workflow
- ✅ Need audit trail (Actions history)
- ✅ Planning post-deployment continuous monitoring

---

## ✅ Next Steps

1. **Immediate (today):**
   - [ ] Check Tailscale status: `tailscale status`
   - [ ] Try SSH: `ssh root@100.120.151.91 "echo OK"`
   - [ ] If SSH works → **Run Option A**
   - [ ] If SSH fails → Run Option B for quick check

2. **Short-term (this week):**
   - [ ] Complete validation checklist
   - [ ] Document results
   - [ ] Proceed to deployment or escalate blockers

3. **Post-deployment:**
   - [ ] Set up Option C (GitHub Actions) for continuous monitoring
   - [ ] Schedule validation every 6 hours
   - [ ] Configure alerts (Discord, email, etc.)

---

## 📞 Escalation Path

If validation fails:

1. **Check local setup:** `tailscale status`, `ssh-keygen -l`, VPN connected?
2. **Check VPS:** Review [`VPS-VALIDATION-GUIDE.md`](VPS-VALIDATION-GUIDE.md) troubleshooting section
3. **Collect diagnostics:** Run Option A with verbose output
4. **Document:** Post results + error logs to #ops or team Slack
5. **Follow up:** Assign to ops/infra team for investigation

---

*Last updated: 2026-06-22 by Claude (claude-haiku-4-5-20251001)*
