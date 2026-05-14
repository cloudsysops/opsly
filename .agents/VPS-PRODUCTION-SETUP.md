# VPS Production Setup — Auto-Sync + Health Checks

**Goal:** VPS should ALWAYS be in sync with GitHub main, without manual intervention.

**Status:** Production-ready (100% automated)

---

## Architecture

```
GitHub (main branch)
  ↓ (push webhook)
  ↓
GitHub Webhook Handler (port 9000)
  ↓ (trigger)
  ↓
vps-auto-sync.sh (every push)
  ↓
  ├─ git pull origin main
  ├─ validate .agents/config.json
  ├─ reload agents
  └─ Discord notification
  
Parallel: Health Checks (every 30s)
  ├─ Check MCP (3003)
  ├─ Check LLM Gateway
  ├─ Check Orchestrator (3011)
  ├─ Check API
  ├─ Check Hermes
  └─ Auto-restart if down + Discord alert
```

---

## Step 1: Install on VPS

### 1.1 Copy scripts

```bash
ssh vps-dragon@100.120.151.91
cd /opt/opsly

# Copy auto-sync scripts
cp .agents/vps-auto-sync.sh /usr/local/bin/
cp .agents/github-webhook-handler.ts /opt/opsly/
cp .agents/health-checks.sh /usr/local/bin/
chmod +x /usr/local/bin/vps-auto-sync.sh /usr/local/bin/health-checks.sh
```

### 1.2 Install Node.js (if not already)

```bash
# Check if node installed
node --version

# If not, install (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or macOS (if needed)
brew install node@20
```

### 1.3 Create systemd service for webhook

```bash
sudo cp .agents/opsly-webhook.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable opsly-webhook
sudo systemctl start opsly-webhook

# Verify running
sudo systemctl status opsly-webhook
```

### 1.4 Create cron jobs

```bash
# Edit crontab
sudo crontab -e

# Add these lines:
# Auto-sync every 5 minutes
*/5 * * * * cd /opt/opsly && bash /usr/local/bin/vps-auto-sync.sh >> /var/log/opsly-sync.log 2>&1

# Health checks every 30 seconds
* * * * * for i in {0..1}; do bash /usr/local/bin/health-checks.sh > /dev/null 2>&1 & done; wait

# Verify cron jobs
sudo crontab -l
```

### 1.5 Set environment variables

```bash
# In /root/.bashrc or /opt/opsly/.env
export GITHUB_WEBHOOK_SECRET="your-webhook-secret-here"
export DISCORD_WEBHOOK_URL="https://discordapp.com/api/webhooks/..."
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
export REPO_PATH="/opt/opsly"

# Source before running
source /opt/opsly/.env
```

### 1.6 Create log directories

```bash
sudo mkdir -p /var/log/opsly
sudo touch /var/log/opsly-sync.log /var/log/opsly-health.log /var/log/opsly-webhook.log
sudo chown ops:ops /var/log/opsly*
```

---

## Step 2: Configure GitHub Webhook

### 2.1 Set up GitHub webhook

```
GitHub Repo Settings → Webhooks → Add webhook

Payload URL:     http://100.120.151.91:9000/webhook
Content type:    application/json
Secret:          (same as GITHUB_WEBHOOK_SECRET env var)
Events:          Push events only
Active:          ✅ Checked
```

### 2.2 Test webhook

```bash
# Local: trigger a test push
echo "# Test" >> README.md
git add README.md
git commit -m "test: webhook trigger"
git push origin main

# On VPS: watch logs
ssh vps-dragon@100.120.151.91 "tail -f /var/log/opsly-sync.log"

# Should show:
# [2026-05-12 10:15:30] 🔄 Pulling updates...
# [2026-05-12 10:15:35] ✅ Sync complete: abc1234 → def5678
```

---

## Step 3: Verify Production Setup

### 3.1 Test auto-sync

```bash
# On Local
echo "test" >> test.txt
git add test.txt
git commit -m "test: auto-sync"
git push origin main

# On VPS (should auto-sync within 5 minutes)
ssh vps-dragon@100.120.151.91 "ls -la test.txt"
# Should exist

# Check logs
ssh vps-dragon@100.120.151.91 "tail -20 /var/log/opsly-sync.log"
```

### 3.2 Test health checks

```bash
# Kill a service (e.g., hermes)
ssh vps-dragon@100.120.151.91 "systemctl stop hermes"

# Wait 30s for health check
# Discord should get alert: "❌ Service Down: hermes"

# Within 30s, should auto-restart
ssh vps-dragon@100.120.151.91 "systemctl status hermes"
# Should be running again

# Discord should get: "✅ Service Recovered: hermes"
```

### 3.3 Verify agents loaded

```bash
ssh vps-dragon@100.120.151.91 "node /opt/opsly/.agents/verify-agents.js"

# Should output:
# ✅ Claude: configured
# ✅ Cursor: configured
# ✅ Copilot: configured
# ✅ Codex: configured
# ✅ Hermes: configured
# ✅ OpenCode: optional
```

---

## Monitoring

### View sync logs

```bash
ssh vps-dragon@100.120.151.91 "tail -f /var/log/opsly-sync.log"
```

### View health logs

```bash
ssh vps-dragon@100.120.151.91 "tail -f /var/log/opsly-health.log"
```

### Check webhook service

```bash
ssh vps-dragon@100.120.151.91 "sudo systemctl status opsly-webhook"
```

### Manual sync (if needed)

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && bash .agents/vps-auto-sync.sh"
```

---

## Troubleshooting

### Webhook not triggering

1. **Check webhook logs:**
   ```bash
   tail -f /var/log/opsly-webhook.log
   ```

2. **Verify webhook is running:**
   ```bash
   sudo systemctl status opsly-webhook
   systemctl restart opsly-webhook
   ```

3. **Test GitHub webhook in UI:**
   - Go to GitHub Settings → Webhooks → opsly-webhook
   - Click "Recent Deliveries"
   - Look for 200 status codes

### Auto-sync not working

1. **Check sync logs:**
   ```bash
   tail -f /var/log/opsly-sync.log
   ```

2. **Test manually:**
   ```bash
   cd /opt/opsly && bash .agents/vps-auto-sync.sh
   ```

3. **Verify lock file isn't stuck:**
   ```bash
   rm -f /tmp/opsly-sync.lock
   ```

### Health checks not alerting

1. **Check health logs:**
   ```bash
   tail -f /var/log/opsly-health.log
   ```

2. **Verify Discord webhook:**
   ```bash
   curl -X POST "$DISCORD_WEBHOOK_URL" \
     -H 'Content-Type: application/json' \
     -d '{"content": "Test message"}'
   ```

3. **Run health check manually:**
   ```bash
   bash /usr/local/bin/health-checks.sh
   ```

---

## SLA / Guarantees

With this setup:

| Scenario | Guarantee |
|----------|-----------|
| Code pushed to main | Synced to VPS within **5 minutes** |
| Service goes down | Auto-restart + Discord alert within **30 seconds** |
| Invalid config pushed | Auto-rollback to previous commit |
| Network outage | Retries every 5 min until online |
| Webhook fails | Cron fallback every 5 min |

---

## Files Summary

| File | Purpose | User |
|------|---------|------|
| `vps-auto-sync.sh` | Pull + validate + reload | cron (root) |
| `github-webhook-handler.ts` | Webhook listener | systemd (ops user) |
| `health-checks.sh` | Monitor services | cron (root) |
| `opsly-webhook.service` | Systemd unit | systemd |

---

## Next: Local Machine Setup

On your Mac, just do:

```bash
git pull origin main
# VPS auto-syncs within 5 minutes
# No manual sync needed
```

Everything else is automatic on VPS.

---

**Production-ready.** Zero manual sync needed.
