---
title: "Hermes Production Deployment — Step by Step"
date: 2026-05-08
status: runbook
---

# Hermes Production Deployment — Step by Step

Este runbook te guía paso a paso para deployar Hermes a VPS (157.245.223.7) e invitar a intcloudsysops.

---

## Prerequisites

- SSH access to VPS (157.245.223.7)
- Git repo cloned locally: `/Users/dragon/cboteros/proyectos/intcloudsysops`
- Docker Compose installed on VPS
- Email configured (.env.mcp)
- Discord webhook configured (.env.mcp)

---

## Step 1: SSH to VPS and Deploy

```bash
# From your local machine
ssh root@157.245.223.7

# Once on VPS, execute deployment script
bash -s < /dev/stdin << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

cd /opt/opsly
echo "Pulling latest code..."
git pull origin main --ff-only

echo "Checking .env.mcp..."
if [ ! -f .env.mcp ]; then
    echo "❌ .env.mcp not found"
    echo "You need to configure:"
    echo "  - EMAIL_HOST, EMAIL_USER, EMAIL_PASS"
    echo "  - DISCORD_WEBHOOK_URL"
    exit 1
fi

echo "Starting Hermes services (9 containers)..."
docker-compose -f infra/docker-compose.mcp.yml up -d

echo "Waiting for services..."
sleep 5

echo "Checking health..."
curl -s http://localhost:3001/health || echo "Services starting..."

echo "✅ Deployment complete"
docker-compose -f infra/docker-compose.mcp.yml ps

DEPLOY_SCRIPT
```

**Expected Output:**
```
✅ Deployment complete
NAME                COMMAND             STATUS              PORTS
opsly-mcp-gateway         up              (healthy)           0.0.0.0:3001->3001/tcp
opsly-agent-manager       up              (healthy)           0.0.0.0:3002->3002/tcp
opsly-tenant-invitations  up              (healthy)           0.0.0.0:3003->3003/tcp
opsly-onboarding-agent    up              (healthy)           0.0.0.0:3004->3004/tcp
opsly-rendering-engine    up              (healthy)           0.0.0.0:3005->3005/tcp
opsly-mcp-rendering       up              (healthy)           0.0.0.0:3006->3006/tcp
infra-postgres            up              (healthy)           5432/tcp
infra-redis-1             up              (healthy)           6379/tcp
prometheus                up              (healthy)           9090/tcp
```

If any service is not "healthy", check logs:
```bash
docker-compose -f infra/docker-compose.mcp.yml logs <service-name>
```

---

## Step 2: Configure Environment Variables

Before running invitation, ensure `.env.mcp` is properly configured on VPS:

```bash
# On VPS
cat /opt/opsly/.env.mcp
```

**Required fields:**
- `EMAIL_HOST=smtp.gmail.com`
- `EMAIL_USER=your-email@gmail.com`
- `EMAIL_PASS=your-app-password`
- `DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...`

If missing, edit and restart:
```bash
nano /opt/opsly/.env.mcp
docker-compose -f infra/docker-compose.mcp.yml restart
```

---

## Step 3: Invite intcloudsysops (From Your Local Machine)

```bash
# Exit VPS if you're still logged in
exit

# From your local machine
cd /Users/dragon/cboteros/proyectos/intcloudsysops
chmod +x scripts/invite-hermes-vps.sh
./scripts/invite-hermes-vps.sh
```

**Expected Output:**
```
════════════════════════════════════════════════════════════════════════════════
                 📧 INVITING INTCLOUDSYSOPS TO HERMES
════════════════════════════════════════════════════════════════════════════════

Configuration:
  Tenant:      intcloudsysops
  Email:       contact@intcloudsysops.com
  VPS:         157.245.223.7
  Domain:      opsly.com

[STEP 1/3] Verifying VPS connectivity...
✅ VPS is reachable and services are running

[STEP 2/3] Generating invitation token...
✅ Token generated
  Token: 3f2b1a4c5d6e7f8g...9h0i1j2k3l4m5n6o

[STEP 3/3] Creating invitation in database...
✅ Invitation created

════════════════════════════════════════════════════════════════════════════════
✅ INVITATION CREATED
════════════════════════════════════════════════════════════════════════════════

Invitation Details:
  Tenant:         intcloudsysops
  Email:          contact@intcloudsysops.com
  Token:          3f2b1a4c5d6e7f8g...
  Acceptance URL: https://opsly.com/accept?token=3f2b1a4c5d6e7f8g...
  Expires:        7 days

Next Steps:

1️⃣  Email is being sent to: contact@intcloudsysops.com
    (Check email in the next 30 seconds)

2️⃣  Tenant clicks the link in email

3️⃣  Onboarding Agent detects acceptance (every 5 minutes)
    Watch progress:
    ./scripts/hermes-tenant-dashboard.sh

4️⃣  4 Agents work in parallel (15 minutes total):
    • Developer Agent → Setup workspace + API keys
    • Architect Agent → Configure roles + permissions
    • QA Agent → Validate health checks
    • Docs Agent → Generate guides

5️⃣  When done, tenant can logea at:
    https://portal.intcloudsysops.opsly.com
```

---

## Step 4: Monitor Onboarding Progress

```bash
# From your local machine
chmod +x scripts/hermes-tenant-dashboard.sh
./scripts/hermes-tenant-dashboard.sh
```

This shows real-time:
- Invitation status (pending/accepted)
- Onboarding agent status
- Agent task progress
- Completion timeline

**Sample output:**
```
════════════════════════════════════════════════════════════════════════════════
                    HERMES TENANT ONBOARDING DASHBOARD
════════════════════════════════════════════════════════════════════════════════

TENANT: intcloudsysops
  Status:          accepted
  Email:           contact@intcloudsysops.com
  Accepted at:     2026-05-08T20:15:30Z

ONBOARDING PROGRESS:
  ⏳ Developer Agent:     IN_PROGRESS (Setup workspace + keys)
     Started:  2026-05-08T20:15:35Z
     ETA:      2 minutes

  ⏳ Architect Agent:     QUEUED (Configure roles)
     ETA:      3 minutes

  ✅ QA Agent:           COMPLETED (Health checks passed)
     Completed: 2026-05-08T20:17:15Z

  ⏳ Docs Agent:         QUEUED (Generate guides)
     ETA:      5 minutes

TIMELINE:
  [████████░░░░░░░░░░] 40% complete — 9 minutes remaining

════════════════════════════════════════════════════════════════════════════════
```

---

## Step 5: Verify Workspace is Ready

Once dashboard shows all 4 agents completed:

```bash
# Check PostgreSQL for tenant workspace
ssh root@157.245.223.7

docker exec infra-postgres psql -U postgres -d hermes_db -c "
  SELECT tenant_name, status, created_at, completed_at 
  FROM tenant_invitations 
  WHERE tenant_name = 'intcloudsysops';"

# Expected output:
#  tenant_name    | status    | created_at          | completed_at
# ────────────────┼───────────┼─────────────────────┼──────────────────
#  intcloudsysops | completed | 2026-05-08 20:15:00 | 2026-05-08 20:30:00
```

---

## Step 6: Test Tenant Access

Once workspace is ready, tenant should receive email:

```
Subject: "Your Hermes Workspace is Ready!"

Body:
  Congratulations! Your Hermes workspace is now live.
  
  Portal: https://portal.intcloudsysops.opsly.com
  Username: admin@intcloudsysops.com
  Temporary Password: [generated]
  
  Next Steps:
  1. Log in to your portal
  2. Change your password
  3. Invite team members
  4. Start using Hermes agents
```

---

## Troubleshooting

### Services not starting

```bash
ssh root@157.245.223.7
cd /opt/opsly
docker-compose -f infra/docker-compose.mcp.yml logs -f --tail=50
```

### Email not sending

Check .env.mcp:
```bash
grep EMAIL /opt/opsly/.env.mcp
```

Test SMTP:
```bash
docker-compose -f infra/docker-compose.mcp.yml exec tenant-invitations \
  node -e "require('./src/email-service').testSMTP()"
```

### Onboarding agent not running

```bash
docker-compose -f infra/docker-compose.mcp.yml logs opsly_onboarding_agent
```

Check cron is enabled:
```bash
grep ONBOARDING_CRON /opt/opsly/.env.mcp
```

### Gateway not responding

```bash
curl -v http://localhost:3001/health
```

Check logs:
```bash
docker-compose -f infra/docker-compose.mcp.yml logs opsly_mcp_gateway
```

---

## Rollback

If something goes wrong:

```bash
ssh root@157.245.223.7
cd /opt/opsly

# Stop services
docker-compose -f infra/docker-compose.mcp.yml down

# Go back to previous commit
git checkout HEAD~1

# Restart
docker-compose -f infra/docker-compose.mcp.yml up -d

# Check status
docker-compose -f infra/docker-compose.mcp.yml ps
```

---

## Next Steps

Once intcloudsysops is onboarded:

1. **Test rendering**: Ask agent to generate a video
   ```bash
   curl -X POST http://157.245.223.7:3005/render/video \
     -H "Content-Type: application/json" \
     -d '{"prompt": "test video", "duration": 10}'
   ```

2. **Monitor cost**: Check PostgreSQL audit_logs
   ```bash
   docker exec infra-postgres psql -U postgres -d hermes_db -c \
     "SELECT COUNT(*), AVG(cost_estimate) FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 hour';"
   ```

3. **Add more tenants**: Repeat invitation process

4. **Setup observability**: Monitor Prometheus (http://157.245.223.7:9090)

---

## Status Checklist

- [ ] SSH to VPS works
- [ ] Docker Compose deployed (9 services up)
- [ ] .env.mcp configured (email + Discord)
- [ ] intcloudsysops invited
- [ ] Email sent successfully
- [ ] Dashboard shows onboarding progress
- [ ] All 4 agents completed
- [ ] Tenant can log in to portal
- [ ] Tests pass (rendering, etc)

---

**Done! You now have Hermes running in production.**

For questions, check docs/SESSION-SUMMARY-COMPLETE.md or QUICK-REFERENCE-HERMES-OPSLY.md
