# WACRM Integration Operations Guide

**Provider:** WACRM (Self-hosted WhatsApp Business Solution)  
**Deployment:** Docker Compose  
**Status:** Ready for Production  

---

## Overview

WACRM is a self-hosted WhatsApp Business solution that provides an alternative to Meta's Cloud API. It offers:

- **Multi-instance messaging:** Multiple WhatsApp Business accounts per server
- **WebSocket support:** Real-time webhook delivery
- **Simplicity:** Fewer configuration steps than Meta
- **Cost:** No per-message charges (self-hosted)

This guide covers deployment, configuration, and operations for Peskids.

---

## Architecture

### Components

```
┌─────────────┐
│   Peskids   │
│    (API)    │
└──────┬──────┘
       │ HTTP/JSON
       ▼
┌─────────────────────────┐
│  WACRM (Docker)         │
│ ┌─────────────────────┐ │
│ │ WhatsApp Provider   │ │
│ │ PostgreSQL Store    │ │
│ │ Redis Queue         │ │
│ │ WebSocket Server    │ │
│ └─────────────────────┘ │
└─────────────────────────┘
       │ Webhook
       ▼
  HTTPS Endpoint
  (Peskids API)
```

### Stack

- **WACRM:** `wacrm/wacrm:latest` (Docker image)
- **Database:** PostgreSQL (included in Docker Compose)
- **Cache:** Redis (included in Docker Compose)
- **Reverse Proxy:** Traefik (shared with Peskids)
- **Monitoring:** Health endpoint + metrics

---

## Deployment

### Step 1: Deploy WACRM with Docker Compose

WACRM is included in `infra/docker-compose.wacrm.yml`:

```bash
# From VPS
cd /opt/opsly

# Start WACRM stack
docker-compose -f infra/docker-compose.wacrm.yml up -d

# Verify services running
docker-compose ps
```

Expected output:
```
NAME                    STATUS
wacrm                   Up (healthy)
wacrm-db                Up (healthy)
wacrm-redis             Up (healthy)
```

### Step 2: Verify Health Check

```bash
# Health endpoint
curl https://wa-peskids.op-sly.com/health

# Expected response
{
  "status": "running",
  "version": "2.0.0",
  "database": "connected",
  "redis": "connected"
}
```

### Step 3: Access WACRM Dashboard (Optional)

WACRM provides a web dashboard for account management:

```
URL: https://wa-peskids.op-sly.com/dashboard
Default credentials: See Doppler `WACRM_ADMIN_PASSWORD`
```

---

## Configuration

### Step 1: Set Environment Variables

In Doppler `prd` config, ensure these are set:

```bash
# WACRM Service Configuration
WACRM_BASE_URL="https://wa-peskids.op-sly.com"
WACRM_API_KEY="generated-api-key-here"
WACRM_WEBHOOK_SECRET="webhook-secret-here"

# Optional: WACRM Dashboard
WACRM_ADMIN_USER="admin"
WACRM_ADMIN_PASSWORD="secure-password"

# Integration with Peskids
PESKIDS_WACRM_PROVIDER="wacrm"
PESKIDS_WACRM_ENABLED="true"
WACRM_WEBHOOK_ENDPOINT="https://peskids.op-sly.com/api/public/integrations/whatsapp/wacrm/webhook"
```

### Step 2: Generate API Key

If not already generated:

```bash
# SSH into WACRM container
docker exec -it wacrm bash

# Generate API key
wacrm-cli generate-api-key --client peskids

# Will output something like:
# API Key: wacrm_key_abc123def456...

# Copy this key to Doppler as WACRM_API_KEY
```

### Step 3: Generate Webhook Secret

```bash
# Generate secure webhook secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output: abc123def456...

# Add to Doppler as WACRM_WEBHOOK_SECRET
```

---

## Adding WhatsApp Account to WACRM

### Step 1: Scan QR Code

WACRM uses WhatsApp Web protocol (similar to WhatsApp Desktop):

```bash
# Get QR code
docker exec -it wacrm curl http://localhost:3000/api/auth/qr

# Will return base64-encoded QR code image
# Scan with WhatsApp app on your phone
```

### Step 2: Verify Account Connected

```bash
# Check account status
curl -H "Authorization: Bearer $WACRM_API_KEY" \
  https://wa-peskids.op-sly.com/api/accounts

# Response:
{
  "accounts": [
    {
      "id": "account-123",
      "phone": "5551234567",
      "status": "connected",
      "connected_at": "2026-07-19T10:00:00Z"
    }
  ]
}
```

### Step 3: Set Webhook URL

```bash
# Configure webhook endpoint
curl -X POST -H "Authorization: Bearer $WACRM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://peskids.op-sly.com/api/public/integrations/whatsapp/wacrm/webhook",
    "webhook_secret": "'$WACRM_WEBHOOK_SECRET'"
  }' \
  https://wa-peskids.op-sly.com/api/config/webhook

# Expected response:
{
  "ok": true,
  "webhook_url": "https://peskids.op-sly.com/api/public/integrations/whatsapp/wacrm/webhook",
  "verified": true
}
```

---

## Testing

### Test 1: Health Check

```bash
# Verify WACRM is healthy
curl https://wa-peskids.op-sly.com/health

# Test via Opsly health integration
curl https://peskids.op-sly.com/api/public/integrations/whatsapp/wacrm/health
```

### Test 2: Send Test Message

```bash
# Use WACRM API to send message
curl -X POST \
  -H "Authorization: Bearer $WACRM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5551234567",
    "message": "Test from WACRM"
  }' \
  https://wa-peskids.op-sly.com/api/messages/send

# Expected response:
{
  "ok": true,
  "message_id": "msg_abc123",
  "status": "sent"
}
```

### Test 3: Webhook Delivery

```bash
# Send test webhook
bash scripts/whatsapp/test-wacrm-webhook.sh health

# Expected output:
# ✅ WACRM Health PASSED
# Response: {"status":"running"}
```

### Test 4: Database Persistence

```bash
# Verify message was persisted
docker exec -i wacrm-db psql -U postgres -d wacrm -c \
  "SELECT * FROM messages ORDER BY created_at DESC LIMIT 1;"
```

---

## Operations

### Monitoring

#### Health Checks

```bash
# Continuous monitoring
watch -n 5 'curl -s https://wa-peskids.op-sly.com/health | jq'

# Peskids integration health
curl -s https://peskids.op-sly.com/api/health/integrations | jq '.integrations.wacrm'
```

#### Logs

```bash
# WACRM logs
docker logs -f wacrm

# Database logs
docker logs -f wacrm-db

# Peskids webhook logs (messages from WACRM)
docker logs -f peskids | grep "WACRM Webhook"
```

#### Metrics

```bash
# WACRM provides metrics endpoint
curl https://wa-peskids.op-sly.com/metrics

# Includes:
# - Messages sent/received
# - Account connections
# - Webhook delivery rate
# - Response times
```

### Troubleshooting

#### Issue: Account Not Connecting

```bash
# Check QR code status
docker exec -it wacrm curl http://localhost:3000/api/auth/status

# If stuck: Reset account
docker exec -it wacrm wacrm-cli reset-account
# Then re-scan QR code
```

#### Issue: Webhook Not Receiving

```bash
# Verify webhook is configured
curl -H "Authorization: Bearer $WACRM_API_KEY" \
  https://wa-peskids.op-sly.com/api/config/webhook

# Resend webhook config if needed
curl -X POST \
  -H "Authorization: Bearer $WACRM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"webhook_url":"https://peskids.op-sly.com/api/public/integrations/whatsapp/wacrm/webhook"}' \
  https://wa-peskids.op-sly.com/api/config/webhook
```

#### Issue: Messages Not Sending

```bash
# Check account status
docker exec -it wacrm wacrm-cli account-status

# If disconnected: Reconnect
# Re-scan QR code via https://wa-peskids.op-sly.com/dashboard
```

#### Issue: High Memory Usage

```bash
# Check Docker resource limits
docker stats wacrm

# If exceeding limits, restart
docker restart wacrm

# Check for memory leaks in logs
docker logs wacrm | grep -i "memory"
```

---

## Backup & Recovery

### Backup WACRM Data

WACRM data is stored in PostgreSQL and Redis (ephemeral cache):

```bash
# Backup PostgreSQL
docker exec wacrm-db pg_dump -U postgres wacrm > wacrm_backup_$(date +%Y%m%d).sql

# Backup volume (if using volumes for state)
docker run --rm -v wacrm_data:/data -v $(pwd):/backup \
  busybox tar czf /backup/wacrm_data_$(date +%Y%m%d).tar.gz -C /data .
```

### Restore from Backup

```bash
# Restore PostgreSQL
cat wacrm_backup_20260719.sql | docker exec -i wacrm-db psql -U postgres -d wacrm

# Restore volume
docker run --rm -v wacrm_data:/data -v $(pwd):/backup \
  busybox tar xzf /backup/wacrm_data_20260719.tar.gz -C /data
```

---

## Scaling & Performance

### Single Instance (Current)

- **Max concurrent connections:** ~1000
- **Max messages per second:** ~100
- **Typical response time:** <500ms

### Multiple WACRM Instances

For larger deployments:

```bash
# Deploy WACRM cluster
docker-compose -f infra/docker-compose.wacrm-cluster.yml up -d

# Use Redis pub/sub for message distribution
# Configure load balancer (Traefik) for multiple WACRM instances
```

---

## Security

### API Key Rotation

```bash
# Generate new API key
docker exec -it wacrm wacrm-cli rotate-api-key

# Update Doppler
doppler secrets set WACRM_API_KEY "new_key_here"

# Restart services
docker-compose restart peskids
```

### Webhook Secret Rotation

```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update in WACRM
curl -X POST \
  -H "Authorization: Bearer $WACRM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"webhook_secret":"new_secret_here"}' \
  https://wa-peskids.op-sly.com/api/config/webhook

# Update Doppler
doppler secrets set WACRM_WEBHOOK_SECRET "new_secret_here"
```

### Account Security

- **QR Code Expiry:** 2 minutes (auto-refreshes)
- **Session Timeout:** 24 hours of inactivity
- **Re-authentication:** Required if IP changes significantly

---

## Maintenance

### Updates

```bash
# Check for updates
docker pull wacrm/wacrm:latest

# Update service
docker-compose -f infra/docker-compose.wacrm.yml pull wacrm
docker-compose -f infra/docker-compose.wacrm.yml up -d wacrm
```

### Database Maintenance

```bash
# Optimize database
docker exec wacrm-db vacuumdb -U postgres wacrm

# Check for issues
docker exec wacrm-db psql -U postgres -c "SELECT * FROM pg_stat_statements LIMIT 10;"
```

### Disk Space

```bash
# Check disk usage
docker exec wacrm du -sh /var/lib/postgresql/data

# Cleanup old logs
docker exec wacrm-db vacuumdb -U postgres -d wacrm
docker exec wacrm rm /var/log/wacrm/*.old
```

---

## Comparison: Meta vs WACRM

| Feature | Meta Cloud API | WACRM |
|---------|----------------|-------|
| **Setup Complexity** | Medium (6-8 steps) | Low (2-3 steps) |
| **Cost** | Per-message charges | None (self-hosted) |
| **Reliability** | Managed by Meta | Your responsibility |
| **Features** | Extensive | Core messaging |
| **Support** | Meta support + docs | Community + Opsly |
| **Status** | Recommended for enterprise | Recommended for cost/simplicity |

---

## Integration with Peskids

### Feature Flags

```bash
# Use Meta (default)
PESKIDS_WHATSAPP_PROVIDER="meta"
META_WEBHOOK_ENABLED=true
PESKIDS_WHATSAPP_ENABLED=true

# Use WACRM
PESKIDS_WHATSAPP_PROVIDER="wacrm"
WACRM_ENABLED=true
PESKIDS_WHATSAPP_ENABLED=true

# Dual provider (failover)
META_WEBHOOK_ENABLED=true
WACRM_ENABLED=true
PESKIDS_WHATSAPP_PROVIDER="meta"  # Primary
```

### Message Flow

```
Inbound Message
  ↓
WACRM Webhook → Peskids API
  ↓
Idempotence Check
  ↓
Persist to Supabase
  ↓
Sync to Twenty CRM
  ↓
Create Lead / Update Contact
  ↓
Trigger n8n Workflow
```

---

## Support

- **WACRM Docs:** https://docs.wacrm.io
- **Opsly Issues:** Open issue on GitHub
- **Contact:** Claude (dev) or DevOps team

---

*Last Updated: 2026-07-19*
*Status: Ready for Production*
