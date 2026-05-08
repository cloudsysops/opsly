---
title: MCP Orchestrator - Production Deployment Guide
status: ready
owner: devops
date: 2026-05-08T17:00:00Z
---

# MCP Orchestrator — Production Deployment

**🚀 LIVE NOW: Multi-agent orchestration with MCP, ready for music rendering, advanced agent tools, and Hermes ecosystem.**

---

## What You Have

```
✅ MCP Gateway (security + approval)
✅ Agent Manager (task coordination)  
✅ PostgreSQL (audit logs + state)
✅ Redis (caching + coordination)
✅ 5 Specialized Agents (architect, dev, qa, security, docs)
✅ CLI tool (hermes-mcp)
✅ Docker Compose (production-ready)
✅ Database schema (audit + agents)
```

**Status:** DEPLOYABLE TODAY  
**Effort:** ~15 minutes (first deploy)

---

## Quick Start (15 minutes)

### Step 1: Clone & Setup

```bash
cd /opt/opsly  # or your Opsly directory
git pull origin main
```

### Step 2: Create Environment File

```bash
cp .env.example .env.mcp

# Edit with your secrets
nano .env.mcp
```

Key variables:
```bash
DB_PASSWORD=your_secure_password_here
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...
GITHUB_TOKEN=ghp_your_token_here
```

### Step 3: Deploy

```bash
chmod +x scripts/deploy-mcp-orchestrator.sh
./scripts/deploy-mcp-orchestrator.sh
```

This will:
- ✅ Check Docker/Docker Compose
- ✅ Build Docker images
- ✅ Start 5 services (Gateway, Manager, Postgres, Redis, Prometheus)
- ✅ Initialize database
- ✅ Run health checks
- ✅ Show next steps

**Total time:** ~3-5 minutes

### Step 4: Verify

```bash
# Check status
docker-compose -f infra/docker-compose.mcp.yml ps

# Test gateway
curl http://localhost:3001/health | jq .

# Test manager
curl http://localhost:3002/health | jq .
```

---

## Using the Orchestrator

### CLI (easiest)

```bash
# Make script executable
chmod +x scripts/hermes-mcp.sh

# Check services
./scripts/hermes-mcp.sh status

# Queue a task
./scripts/hermes-mcp.sh task queue developer implement "Add auth feature" high

# Call a tool (READ = no approval)
./scripts/hermes-mcp.sh tool call architect github.read_file READ '{"path": "package.json"}'

# View audit logs
./scripts/hermes-mcp.sh logs

# Get agent stats
./scripts/hermes-mcp.sh stats developer
```

### HTTP API

#### Queue Task
```bash
curl -X POST http://localhost:3002/tasks/queue \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "developer",
    "type": "implement",
    "description": "Implement feature X",
    "priority": "high"
  }'
```

#### Call MCP Tool (READ tier - auto-approved)
```bash
curl -X POST http://localhost:3001/mcp/call \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "architect",
    "tool_name": "github.read_file",
    "tool_tier": "READ",
    "params": {"path": "package.json"}
  }'
```

#### Call MCP Tool (WRITE tier - requires approval)
```bash
curl -X POST http://localhost:3001/mcp/call \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "developer",
    "tool_name": "github.create_branch",
    "tool_tier": "WRITE",
    "params": {"branch": "feature/new-auth", "from": "main"}
  }'

# Response: status = PENDING (waiting for approval)
# Watch Discord for approval notification
```

#### Approve Operation (via Discord or API)
```bash
curl -X POST http://localhost:3001/approval/response \
  -H "Content-Type: application/json" \
  -d '{
    "approval_id": "approval_abc123",
    "action": "approve",
    "user": "john@example.com"
  }'
```

#### View Audit Logs
```bash
curl http://localhost:3001/audit-logs | jq .

# Filter by agent
curl "http://localhost:3001/audit-logs?agent_id=developer" | jq .
```

#### Get Agent Stats
```bash
curl http://localhost:3002/agents/developer/stats | jq .
```

---

## Architecture (What's Running)

```
┌─────────────────────────────────────────┐
│     MCP Gateway (Port 3001)            │
│  - Routes MCP calls                    │
│  - Manages approvals                   │
│  - Logs to audit table                 │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│   Agent Manager (Port 3002)            │
│  - Queue task management               │
│  - Task coordination                   │
│  - Agent statistics                    │
└─────────────────────────────────────────┘
         ↓
    ┌─────────────┬──────────────┐
    ↓             ↓              ↓
PostgreSQL    Redis        Prometheus
(Audit logs) (Cache)       (Metrics)
```

---

## Agents Available

### 1️⃣ Architect Agent
- Role: Design decisions, code review
- Tools: GitHub read, Filesystem read, Browser
- Use: `./scripts/hermes-mcp.sh task queue architect ...`

### 2️⃣ Developer Agent
- Role: Feature implementation, bugfixes
- Tools: GitHub r/w, Filesystem r/w, tests
- Use: `./scripts/hermes-mcp.sh task queue developer ...`

### 3️⃣ QA Agent
- Role: Testing, validation
- Tools: GitHub, tests, browser
- Use: `./scripts/hermes-mcp.sh task queue qa ...`

### 4️⃣ Security Agent
- Role: Vulnerability scanning
- Tools: GitHub read, audit tools
- Use: `./scripts/hermes-mcp.sh task queue security ...`

### 5️⃣ Docs Agent
- Role: Documentation management
- Tools: GitHub r/w docs, filesystem
- Use: `./scripts/hermes-mcp.sh task queue docs ...`

---

## Monitoring

### View Logs (Real-time)
```bash
docker-compose -f infra/docker-compose.mcp.yml logs -f mcp-gateway
```

### Check Service Health
```bash
# All services
docker-compose -f infra/docker-compose.mcp.yml ps

# Specific service
docker-compose -f infra/docker-compose.mcp.yml exec mcp-gateway curl http://localhost:3001/health

# PostgreSQL
docker-compose -f infra/docker-compose.mcp.yml exec postgres pg_isready

# Redis
docker-compose -f infra/docker-compose.mcp.yml exec redis redis-cli ping
```

### View Audit Logs (Database)
```bash
# Connect to database
docker-compose -f infra/docker-compose.mcp.yml exec postgres psql -U opsly_mcp -d opsly_mcp

# Query audit logs
SELECT agent_id, tool_name, operation_type, status, timestamp
FROM audit_logs
ORDER BY timestamp DESC
LIMIT 20;
```

### Prometheus Metrics
```
http://localhost:9090
```

---

## Security Checklist

✅ **Deployment**
- [ ] Database password changed (not default)
- [ ] Discord webhook configured
- [ ] GitHub token has correct permissions
- [ ] Network firewalls allow only necessary ports
- [ ] HTTPS enabled (use Traefik/nginx in front)

✅ **Secrets**
- [ ] No secrets in code (use environment variables)
- [ ] Doppler configured for secret rotation
- [ ] Audit logs encrypted at rest
- [ ] Database backups enabled

✅ **Access Control**
- [ ] Only authorized users can approve WRITE operations
- [ ] Discord webhook access controlled
- [ ] Database access restricted to containers
- [ ] API endpoints behind authentication (optional)

---

## Next Steps: Music Rendering + Advanced Tools

The MCP Orchestrator is ready for:

### 1. Add Music Rendering Tool
```bash
# Create new MCP server for music generation
# apps/mcp-music-renderer/

# Tool: music.render
# Input: prompt, duration, style
# Output: audio file
```

### 2. Add Image Generation Tools
```bash
# Create new MCP server for image generation
# apps/mcp-image-generator/

# Tool: image.generate
# Input: prompt, size, style
# Output: image file
```

### 3. Add Custom Tools
```bash
# Create new MCP servers for your use cases
# - Video generation
# - 3D model generation
# - Code synthesis
# - Data analysis
```

### 4. Deploy Hermes Agents
```bash
# Use orchestrator with full Hermes ecosystem
# - Code review agents
# - Deployment agents
# - Monitoring agents
# - Custom domain-specific agents
```

---

## Troubleshooting

### Services won't start
```bash
# Check Docker daemon
docker ps

# Check compose file
docker-compose -f infra/docker-compose.mcp.yml config

# View logs
docker-compose -f infra/docker-compose.mcp.yml logs
```

### Database connection error
```bash
# Check PostgreSQL is running
docker-compose -f infra/docker-compose.mcp.yml ps postgres

# Check connection string in .env.mcp
echo $DATABASE_URL

# Restart database
docker-compose -f infra/docker-compose.mcp.yml restart postgres
```

### Discord notifications not working
```bash
# Check webhook URL
echo $DISCORD_WEBHOOK_URL

# Test webhook manually
curl -X POST $DISCORD_WEBHOOK_URL \
  -d '{"content": "Test message"}'
```

### Agent not responding
```bash
# Check agent config in database
docker-compose -f infra/docker-compose.mcp.yml exec postgres psql -U opsly_mcp -d opsly_mcp
SELECT * FROM agents WHERE agent_id = 'developer';

# Check agent logs
docker-compose -f infra/docker-compose.mcp.yml logs agent-manager
```

---

## Cleanup

### Stop services (keep data)
```bash
docker-compose -f infra/docker-compose.mcp.yml stop
```

### Stop and remove containers (keep volumes)
```bash
docker-compose -f infra/docker-compose.mcp.yml down
```

### Full cleanup (delete everything)
```bash
docker-compose -f infra/docker-compose.mcp.yml down -v
```

---

## What's Different from Before

**Before:** Architecture designed, documentation written  
**Now:** 🚀 **DEPLOYED AND RUNNING**

- ✅ MCP Gateway serving on :3001
- ✅ Agent Manager serving on :3002
- ✅ PostgreSQL storing audit logs
- ✅ Redis caching operations
- ✅ CLI tool ready to use
- ✅ All 5 agents loaded and ready

**Next:** Add music rendering, image generation, custom tools

---

## Files

```
apps/
  ├─ mcp-gateway/
  │  ├─ src/gateway.ts          (Main orchestrator service)
  │  ├─ prisma/schema.prisma    (Database schema)
  │  └─ Dockerfile
  └─ agent-manager/
     ├─ src/index.ts            (Task coordination)
     └─ Dockerfile

infra/
  └─ docker-compose.mcp.yml     (Full stack definition)

scripts/
  ├─ deploy-mcp-orchestrator.sh (One-command deploy)
  └─ hermes-mcp.sh              (CLI tool)

docs/
  ├─ ADR-029-mcp-orchestration.md
  ├─ AGENT-PROMPTS-REFERENCE.md
  └─ IMPLEMENTATION-MCP-AGENTS.md
```

---

## Support

For issues or questions:

1. Check logs: `docker-compose -f infra/docker-compose.mcp.yml logs`
2. Read ADR-029: `docs/adr/ADR-029-mcp-orchestration.md`
3. Check implementation guide: `docs/IMPLEMENTATION-MCP-AGENTS.md`

---

**Status:** ✅ **PRODUCTION READY**  
**Deployed:** 2026-05-08  
**Next:** Music rendering + advanced agent tools
