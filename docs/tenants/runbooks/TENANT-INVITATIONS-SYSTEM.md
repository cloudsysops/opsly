---
title: Hermes Tenant Invitations System
status: live
owner: operations
date: 2026-05-08T18:00:00Z
---

# Hermes Tenant Invitations System

**🎉 Autonomous tenant onboarding + invitations → Fully automated with agents**

---

## Overview

The **Tenant Invitations System** allows you to:

1. ✅ Invite tenants to Hermes platform
2. ✅ Automatically send invitation emails
3. ✅ Track invitation acceptance
4. ✅ Auto-trigger agent-driven onboarding
5. ✅ Monitor onboarding progress in real-time

All fully autonomous. **You send invites, agents handle the rest.**

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Tenant Invitations Service (3003)     │
│  - Generate invitation tokens          │
│  - Send email invites                  │
│  - Track invitation status             │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  Tenant Accepts (email link)            │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│  Tenant Onboarding Agent (3004)         │
│  - Monitor for accepted invites         │
│  - Queue setup tasks (every 5 min)      │
│  - Coordinate all agents                │
└─────────────────────────────────────────┘
         ↓
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Developer   │  Architect   │     QA       │    Docs      │
│  Setup       │  Configure   │  Validate    │ Document     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

---

## Quick Start (5 minutes)

### 1. Deploy Services

```bash
cd /opt/opsly
docker-compose -f infra/docker-compose.mcp.yml up -d tenant-invitations tenant-onboarding-agent
```

### 2. Configure Email

Create `.env.mcp`:
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@hermes.intcloudsysops.com
```

### 3. Invite Tenants

```bash
# Single tenant
./scripts/hermes-tenant-invitations.sh invite intcloudsysops "intcloudsysops" \
  contact@intcloudsysops.com "Team" enterprise

# Batch from CSV
./scripts/hermes-tenant-invitations.sh batch config/tenants-to-invite.csv
```

### 4. Monitor

```bash
./scripts/hermes-tenant-dashboard.sh
```

**That's it.** Agents handle everything else.

---

## How It Works

### Step 1: Send Invitation

You run:
```bash
./scripts/hermes-tenant-invitations.sh invite intcloudsysops "intcloudsysops" \
  contact@intcloudsysops.com "Team" enterprise
```

System does:
- ✅ Generates unique invitation token
- ✅ Stores in database (expires in 7 days)
- ✅ Sends invitation email with acceptance link
- ✅ Logs to audit trail

### Step 2: Tenant Accepts

Tenant clicks email link or visits:
```
https://portal.hermes.intcloudsysops.com/onboarding/accept/<token>
```

System does:
- ✅ Validates token (not expired, not already used)
- ✅ Marks invitation as 'accepted'
- ✅ Logs acceptance to database
- ✅ Queues onboarding tasks

### Step 3: Agents Auto-Onboard (Every 5 minutes)

The **Tenant Onboarding Agent** wakes up and:

1. **Developer Agent** (TIER 1)
   - Creates tenant workspace in Hermes
   - Sets up API keys
   - Configures agent access
   - Logs: `TENANT_SETUP_COMPLETE`

2. **Architect Agent** (TIER 2 - requires approval)
   - Designs tenant architecture
   - Configures agent roles + permissions
   - Sets up approval workflows
   - Logs: `TENANT_CONFIGURED`

3. **QA Agent** (TIER 1)
   - Runs health checks
   - Validates configuration
   - Tests agent connectivity
   - Logs: `TENANT_VALIDATED`

4. **Docs Agent** (TIER 1)
   - Creates onboarding guide
   - Documents workflows
   - Sets up knowledge base
   - Logs: `TENANT_DOCUMENTED`

### Step 4: Tenant is Ready

When all tasks complete:
- ✅ Tenant workspace activated
- ✅ All agents configured + tested
- ✅ Documentation auto-generated
- ✅ Welcome email sent
- ✅ Dashboard ready to use

---

## Usage

### Invite Single Tenant

```bash
./scripts/hermes-tenant-invitations.sh invite <slug> <name> <email> <contact> [plan] [billing_email]
```

Example:
```bash
./scripts/hermes-tenant-invitations.sh invite acme-corp "ACME Corporation" \
  contact@acme.com "Jane Smith" pro billing@acme.com
```

### Batch Invite

```bash
./scripts/hermes-tenant-invitations.sh batch tenants-to-invite.csv
```

CSV format:
```csv
slug,name,email,contact_name,plan,billing_email
acme-corp,"ACME Corporation",contact@acme.com,"Jane Smith",pro,billing@acme.com
startup-xyz,"Startup XYZ",team@xyz.com,"Bob Johnson",starter,billing@xyz.com
```

### View Pending Invitations

```bash
./scripts/hermes-tenant-invitations.sh pending
```

Output:
```json
{
  "count": 2,
  "invitations": [
    {
      "tenant_id": "intcloudsysops",
      "tenant_name": "intcloudsysops",
      "created_at": "2026-05-08T18:00:00Z",
      "expires_at": "2026-05-15T18:00:00Z",
      "days_until_expiry": 7
    }
  ]
}
```

### Check Invitation Status

```bash
./scripts/hermes-tenant-invitations.sh status <token>
```

### Monitor Dashboard

Real-time dashboard with:
- Pending invitations
- Acceptance status
- Agent progress
- Onboarding timeline

```bash
./scripts/hermes-tenant-dashboard.sh
```

---

## API Endpoints

### POST /tenants/invite

Send invitation to tenant.

Request:
```bash
curl -X POST http://localhost:3003/tenants/invite \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "intcloudsysops",
    "tenant_name": "intcloudsysops",
    "contact_email": "contact@intcloudsysops.com",
    "contact_name": "Team",
    "plan": "enterprise",
    "features": ["agents", "music", "images", "videos"],
    "billing_contact_email": "billing@intcloudsysops.com"
  }'
```

Response:
```json
{
  "status": "INVITED",
  "tenant_id": "intcloudsysops",
  "invitation_id": "inv_123abc",
  "invitation_token": "abc123def456...",
  "expires_at": "2026-05-15T18:00:00Z",
  "message": "Invitation sent to contact@intcloudsysops.com"
}
```

### POST /tenants/accept/:token

Accept invitation (called via email link).

Response:
```json
{
  "status": "ACCEPTED",
  "tenant_id": "intcloudsysops",
  "message": "Onboarding tasks queued for agents",
  "next_steps": "Check your dashboard for setup progress"
}
```

### GET /invitations/pending

List all pending invitations.

Response:
```json
{
  "count": 2,
  "invitations": [...]
}
```

### GET /invitations/status/:token

Check single invitation status.

Response:
```json
{
  "tenant_id": "intcloudsysops",
  "tenant_name": "intcloudsysops",
  "status": "pending|accepted|rejected",
  "created_at": "2026-05-08T18:00:00Z",
  "expires_at": "2026-05-15T18:00:00Z",
  "is_expired": false
}
```

### GET /tenants/:tenant_id/onboarding-status

Check onboarding progress.

Response:
```json
{
  "tenant_id": "intcloudsysops",
  "total_steps": 4,
  "completed_steps": 2,
  "in_progress": 1,
  "failed": 0,
  "timeline": [
    {
      "timestamp": "2026-05-08T18:00:00Z",
      "step": "TENANT_ONBOARDING_STARTED",
      "status": "SUCCESS"
    },
    {
      "timestamp": "2026-05-08T18:05:00Z",
      "step": "TENANT_SETUP_COMPLETE",
      "status": "SUCCESS"
    }
  ]
}
```

---

## Database Schema

### tenant_invitations

```sql
CREATE TABLE tenant_invitations (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(255) UNIQUE NOT NULL,
  tenant_name VARCHAR(255) NOT NULL,
  tenant_email VARCHAR(255) NOT NULL,
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  UNIQUE(tenant_id)
);

CREATE INDEX idx_tenant_id ON tenant_invitations(tenant_id);
CREATE INDEX idx_status ON tenant_invitations(status);
CREATE INDEX idx_expires_at ON tenant_invitations(expires_at);
```

### audit_logs (used for onboarding tracking)

All onboarding steps logged to existing `audit_logs` table:
- `operation_type`: TENANT_INVITED, TENANT_ACCEPTED, TENANT_ONBOARDING_STARTED, TENANT_SETUP_COMPLETE, TENANT_VALIDATED, TENANT_DOCUMENTED
- `status`: SUCCESS, PENDING, ERROR
- `params.tenant_id`: tenant identifier
- `timestamp`: when step occurred

---

## Security

### Invitation Tokens

- 32-byte random tokens (256-bit entropy)
- Expire after 7 days
- One-time use only
- Not included in logs (only hashed token stored)

### Email

- Tenant emails verified at invitation
- Acceptance link includes token (not password)
- No credentials sent via email
- Emails use encrypted connection (TLS)

### Onboarding

- Each agent task requires proper authentication
- Write operations (TIER 2) need approval
- Setup (TIER 1) is auto-approved for speed
- All actions logged to audit trail

---

## Monitoring

### Real-time Dashboard

```bash
./scripts/hermes-tenant-dashboard.sh
```

Shows:
- Pending invitations (count, emails, expiry)
- Accepted tenants (recent)
- Agent status (health checks)
- Quick actions (invite, refresh, logs)

### Logs

View all invitations:
```bash
docker-compose -f infra/docker-compose.mcp.yml logs -f tenant-invitations
```

View onboarding:
```bash
docker-compose -f infra/docker-compose.mcp.yml logs -f tenant-onboarding-agent
```

### Database Queries

```bash
# Get pending invitations
SELECT * FROM tenant_invitations WHERE status = 'pending';

# Get accepted invitations
SELECT * FROM tenant_invitations WHERE status = 'accepted';

# Get onboarding timeline
SELECT * FROM audit_logs 
WHERE operation_type LIKE 'TENANT_%' 
ORDER BY timestamp DESC;

# Get onboarding status for tenant
SELECT * FROM audit_logs 
WHERE params->>'tenant_id' = 'intcloudsysops' 
AND operation_type LIKE 'TENANT_%'
ORDER BY timestamp DESC;
```

---

## Troubleshooting

### Email Not Sent

1. Check `.env.mcp` email config
2. Verify SMTP credentials
3. Check logs: `docker-compose ... logs tenant-invitations`
4. Test manually:
```bash
curl -X POST http://localhost:3003/tenants/invite \
  -d '{"tenant_slug": "test", ...}'
```

### Onboarding Not Starting

1. Check tenant accepted invitation
2. Verify onboarding agent is running: `docker-compose ... ps tenant-onboarding-agent`
3. Check logs: `docker-compose ... logs tenant-onboarding-agent`
4. Manually trigger: Hit `/tenants/accept/<token>` endpoint

### Agent Tasks Not Queuing

1. Verify Agent Manager is running (port 3002)
2. Check database connection
3. View logs: `docker-compose ... logs agent-manager`
4. Query audit_logs: `SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;`

---

## Examples

### Invite intcloudsysops (Right Now)

```bash
./scripts/hermes-tenant-invitations.sh invite intcloudsysops "intcloudsysops" \
  contact@intcloudsysops.com "Team" enterprise
```

Expected output:
```
✅ Invited intcloudsysops — email sent to contact@intcloudsysops.com

Details:
{
  "status": "INVITED",
  "tenant_id": "intcloudsysops",
  "message": "Invitation sent to contact@intcloudsysops.com"
}

🔗 Acceptance URL:
   https://portal.hermes.intcloudsysops.com/onboarding/accept/abc123def456...

📝 Next Steps:
   1. Share the acceptance URL with the team
   2. Team accepts invitation via email link or URL
   3. Hermes agents automatically set up the workspace
   4. Workspace is ready to use!
```

### Batch Invite Multiple Tenants

```bash
./scripts/hermes-tenant-invitations.sh batch config/tenants-to-invite.csv
```

### Monitor Progress

```bash
./scripts/hermes-tenant-dashboard.sh
```

Then:
- Press 'r' to refresh
- Press 'i' to invite new tenant
- Press 'l' to view logs
- Press 'q' to quit

---

## Services

| Service | Port | Purpose |
|---------|------|---------|
| tenant-invitations | 3003 | Manage invitations + tokens |
| tenant-onboarding-agent | 3004 | Auto-trigger agent onboarding |
| agent-manager | 3002 | Queue tasks to agents |
| mcp-gateway | 3001 | Execute agent tools |
| postgres | 5432 | Store invites + audit logs |

All run in Docker Compose, auto-restart on failure.

---

## Next

✅ Deploy Tenant Invitations System (THIS)  
✅ Invite intcloudsysops  
✅ Monitor onboarding in real-time  
⏳ Agents auto-complete setup (5 min cron)  
✅ Tenant workspace ready  

Then:
- Add music rendering tool
- Add image generation tool
- Invite more tenants
- Scale to full Hermes ecosystem

---

**Status:** ✅ LIVE AND RUNNING  
**Last Updated:** 2026-05-08  
**Owner:** Hermes Autonomous System
