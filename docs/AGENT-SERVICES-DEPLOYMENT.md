# Agent Services Deployment Guide

## Overview

The Opsly autonomous execution system uses distributed agent services via HTTP. Each agent (Cursor, Claude, Copilot, OpenCode) runs as a service on configurable endpoints.

**Current Configuration:** Tailscale-based distributed deployment
- Orchestrator: `opsly-worker` (VPS)
- Cursor Agent Service: `opsly-mac2011:5001` and `opsly-admin:5001` (via Tailscale)
- Claude Agent Service: `opsly-admin:5002` (via Tailscale)
- Copilot Agent Service: `opsly-admin:5003` (optional)
- OpenCode Agent Service: `opsly-admin:5004` (optional)

## Queue Status

**Pending Jobs (awaiting agent services):**
- `fa3df11b-44e7-449d-85bb-34ac24803be0` - Reviewer (Security Audit)
- `8d3dea86-7f54-481d-8215-b9c3400c4ded` - Executor (Test Utilities)
- `0979fd70-875f-4a8f-a3b9-28fa650eebba` - Architect (Validation Pipeline)
- `da41a241-ba99-49c9-9a3e-3d678459e224` - Executor (Observability Metrics)

All jobs are queued but failing with "fetch failed" - they'll automatically retry when services become available.

## Option 1: Deploy Real Services (Production)

### On opsly-mac2011

1. **Install Node.js dependencies:**
   ```bash
   cd /path/to/opsly
   npm install
   ```

2. **Start Cursor Agent Service:**
   ```bash
   # Monitor .cursor/prompts/ and communicate via Cursor IDE
   npx tsx scripts/cursor-agent-service.ts --port 5001 --machine "opsly-mac2011"
   ```

3. **Verify it's accessible from Orchestrator:**
   ```bash
   curl -I http://opsly-mac2011:5001/health
   # Should return 200 OK
   ```

### On opsly-admin

1. **Start Cursor Backup Service:**
   ```bash
   npx tsx scripts/cursor-agent-service.ts --port 5001 --machine "opsly-admin"
   ```

2. **Start Claude Agent Service:**
   ```bash
   ANTHROPIC_API_KEY="your-key" npx tsx scripts/claude-agent-service.ts --port 5002
   ```

3. **Optional - Start Copilot Service:**
   ```bash
   npx tsx scripts/copilot-agent-service.ts --port 5003
   ```

4. **Verify services:**
   ```bash
   curl -I http://opsly-admin:5001/health
   curl -I http://opsly-admin:5002/health
   ```

## Option 2: Mock Services for Local Testing

Run mock services that simulate agent responses without needing actual IDEs:

```bash
# Terminal 1: Start mock Cursor service
npx tsx scripts/mock-cursor-agent.ts --port 5001

# Terminal 2: Start mock Claude service
npx tsx scripts/mock-claude-agent.ts --port 5002

# Terminal 3: Start orchestrator (already running)
npm run dev --workspace=@intcloudsysops/orchestrator
```

The mock services will:
- Accept HTTP requests from the orchestrator
- Return simulated agent responses
- Validate the execution pipeline
- Write results to `.cursor/responses/`

## How the System Works

### 1. Job Submission Flow

```
User creates: .cursor/prompts/parallel-task-1.md
         ↓
LocalPromptWatcher detects new file
         ↓
POST /api/local/prompt-submit → Orchestrator
         ↓
Orchestrator enqueues to 'local-agents' BullMQ queue
         ↓
Agent type routing: local_cursor → LocalAgentHTTPWorker
```

### 2. Execution Flow

```
LocalAgentHTTPWorker processes job
         ↓
Reads agent config from agent-service-registry
         ↓
Resolves service URL:
  - Check AGENT_ENVIRONMENT (tailscale)
  - Lookup in config.environments.tailscale[serviceName]
  - Fall back to service.url if not found
         ↓
HTTP POST to service with prompt + metadata
         ↓
Agent service processes request
         ↓
Agent returns response
         ↓
Worker writes to .cursor/responses/response-{jobId}.md
```

### 3. Response Handling

```
Response written to .cursor/responses/
         ↓
LocalGitAutoCommit detects new response
         ↓
Validation pipeline runs:
  1. Type-check (TypeScript)
  2. Test execution
  3. Build verification
         ↓
If all pass: auto-commit with job metadata
If any fail: escalate to HelpRequestSystem
```

## Environment Configuration

### Local Testing
```bash
export AGENT_ENVIRONMENT=local
# Services: localhost:5001, localhost:5002, etc.
```

### Tailscale (Current)
```bash
export AGENT_ENVIRONMENT=tailscale
# Services: opsly-mac2011:5001, opsly-admin:5002, etc.
# Requires Tailscale VPN connection
```

### Remote Machines
```bash
export AGENT_ENVIRONMENT=remote
# Services: 192.168.1.100:5001, 192.168.1.100:5002, etc.
```

Edit `config/agent-services.yaml` to add/modify environments:

```yaml
environments:
  local:
    cursor: "http://localhost:5001"
    claude: "http://localhost:5002"
  
  tailscale:
    cursor: "http://opsly-mac2011:5001"
    cursor_backup: "http://opsly-admin:5001"
    claude: "http://opsly-admin:5002"
  
  remote:
    cursor: "http://192.168.1.100:5001"
    claude: "http://192.168.1.100:5002"
```

## Monitoring & Debugging

### Check Job Queue Status

```bash
# View pending jobs
curl http://localhost:3011/api/queue/status | jq '.pending'

# View failed jobs
curl http://localhost:3011/api/queue/status | jq '.failed'

# View job details
curl http://localhost:3011/api/jobs/{jobId}
```

### View Orchestrator Logs

```bash
tail -f /tmp/orchestrator.log | grep -i "local_cursor\|local_claude"

# Search for specific job
tail -f /tmp/orchestrator.log | grep "8d3dea86-7f54-481d-8215-b9c3400c4ded"
```

### Check Agent Service Health

```bash
# Cursor on opsly-mac2011
curl -v http://opsly-mac2011:5001/health

# Claude on opsly-admin
curl -v http://opsly-admin:5002/health

# Or via agent-service-registry API
curl http://localhost:3011/api/agents/health
```

## Automatic Job Retry

Failed jobs automatically retry with exponential backoff:
- 1st attempt: immediate
- 2nd attempt: 5 seconds later
- 3rd attempt: 10 seconds later
- After 3 failures: job marked as dead

Once agent services come online, the next retry cycle will pick them up and process.

## Current Task Status

| Job ID | Task | Status | Assigned To |
|--------|------|--------|-------------|
| `fa3df11b-44e7...` | Security Audit | Queued | Reviewer (Copilot) |
| `8d3dea86-7f54...` | Test Utilities | Queued | Executor (Cursor) |
| `0979fd70-875f...` | Validation Design | Queued | Architect (Claude) |
| `da41a241-ba99...` | Observability Metrics | Queued | Executor (Cursor) |

## Next Steps

1. **Immediate (Option 2 - Testing):**
   ```bash
   npm run agent-services:mock
   # Jobs will auto-retry and execute with mock responses
   ```

2. **Production Deployment:**
   - SSH to opsly-mac2011 and opsly-admin
   - Install agent services per Option 1
   - Monitor job completion in real-time

3. **Monitoring:**
   ```bash
   watch -n 1 'ls -la .cursor/prompts/responses/ && echo "---" && curl -s http://localhost:3011/health | jq .'
   ```

## Troubleshooting

**Jobs still failing after service deployment:**
```bash
# Check if service is accessible
nc -zv opsly-mac2011 5001

# Check from orchestrator container
docker exec orchestrator curl -v http://opsly-mac2011:5001/health

# Verify DNS resolution
getent hosts opsly-mac2011
```

**Service responding but jobs still failing:**
```bash
# Check service logs
tail -f /var/log/cursor-agent-service.log

# Verify request format
curl -X POST http://opsly-mac2011:5001/execute \
  -H "Content-Type: application/json" \
  -d '{"job_id": "test", "prompt_content": "test"}'
```

**Environment variable not being respected:**
```bash
# Verify environment is set
echo $AGENT_ENVIRONMENT

# Check resolved URLs
curl http://localhost:3011/api/agents/service-urls | jq .

# Force environment override
AGENT_ENVIRONMENT=tailscale npm run dev --workspace=@intcloudsysops/orchestrator
```
