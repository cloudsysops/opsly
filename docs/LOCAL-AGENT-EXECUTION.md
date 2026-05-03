---
status: active
owner: operations
last_update: 2026-05-03
---

# Local Agent Execution System

## Overview

Opsly's **Local Agent Execution System** enables autonomous execution of tasks on local machines (MacBook, VPS, Docker) by routing prompts through the OpenClaw orchestrator to specialized agent services.

**Architecture:** Distributed HTTP-based worker pattern with configurable service endpoints.

```
.cursor/prompts/task.md
    ↓ (LocalPromptWatcher detects)
POST /api/local/prompt-submit
    ↓ (enqueue to local-agents queue)
Unified Local Agent Worker
    ↓ (HTTP POST to service)
Agent Service (5001, 3010, etc.)
    ↓ (executes, returns response)
.cursor/responses/response-{id}.md
    ↓ (Git Auto-Commit detects)
git commit + push
```

## Components

### 1. Orchestrator Endpoint

**Endpoint:** `POST /api/local/prompt-submit`  
**Location:** `apps/orchestrator/src/health-server.ts:878`

```bash
curl -X POST http://localhost:3011/api/local/prompt-submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PLATFORM_ADMIN_TOKEN" \
  -d '{
    "prompt_body": "Create a hello world function",
    "agent_role": "executor",
    "max_steps": 10,
    "goal": "Test local execution",
    "context": {},
    "request_id": "test-1"
  }'
```

**Response:**
```json
{
  "ok": true,
  "job_id": "12345",
  "request_id": "test-1"
}
```

### 2. Local Agents Queue & Worker

**Queue:** `local-agents` (separate from `openclaw`)  
**Worker:** `apps/orchestrator/src/workers/local-agent-http-worker.ts`

Unified worker handles all job types:
- `local_cursor` → POST to Cursor service (port 5001)
- `local_claude` → POST to LLM Gateway (port 3010)
- `local_copilot` → POST to Copilot service (port 5003)
- `local_opencode` → POST to OpenCode service (port 5004)

### 3. Cursor Agent Service

**Location:** `scripts/cursor-agent-service.ts`  
**Port:** 5001 (configurable)

```bash
npx tsx scripts/cursor-agent-service.ts --port 5001
```

**Responsibilities:**
- Listens for HTTP POST on `/execute`
- Writes prompt to `.cursor/prompts/pending/`
- Opens Cursor IDE with prompt
- Waits for response in `.cursor/responses/`
- Returns response path via HTTP

**API:**
```bash
POST http://localhost:5001/execute
Content-Type: application/json

{
  "prompt_content": "Your prompt here",
  "job_id": "unique-id",
  "agent_role": "executor",
  "max_steps": 5
}
```

### 4. Local Prompt Watcher

**Location:** `scripts/local-prompt-watcher.ts`

Monitors `.cursor/prompts/` directory for new `.md` files and automatically submits them to the orchestrator.

```bash
# With environment variables
PLATFORM_ADMIN_TOKEN="your-token" \
ORCHESTRATOR_URL="http://localhost:3011" \
CURSOR_DIR=".cursor" \
npx tsx scripts/local-prompt-watcher.ts
```

**Features:**
- Watches `.cursor/prompts/*.md` for changes
- Parses YAML frontmatter
- Auto-submits to orchestrator
- Tracks state in `.cursor/prompts/.metadata.json`

### 5. Git Auto-Commit Daemon

**Location:** `scripts/local-git-auto-commit.ts`

Monitors `.cursor/responses/` and auto-commits completed responses.

```bash
npx tsx scripts/local-git-auto-commit.ts \
  --watch-dir .cursor/responses \
  --working-dir . \
  --auto-push
```

## Quick Start

### Prerequisites

```bash
# 1. Redis running
redis-server --daemonize yes --port 6379

# 2. Orchestrator built and ready
npm run build --workspace=@intcloudsysops/orchestrator
```

### Setup (Terminal 1: Orchestrator)

```bash
# Set token
export PLATFORM_ADMIN_TOKEN="local-dev"

# Start orchestrator
cd apps/orchestrator
node dist/index.js
```

### Setup (Terminal 2: Cursor Agent Service)

```bash
# On MacBook or local machine with Cursor IDE
npx tsx scripts/cursor-agent-service.ts --port 5001
```

### Setup (Terminal 3: Prompt Watcher)

```bash
export PLATFORM_ADMIN_TOKEN="local-dev"
npx tsx scripts/local-prompt-watcher.ts
```

### Setup (Terminal 4: Git Auto-Commit)

```bash
npx tsx scripts/local-git-auto-commit.ts
```

### Submit a Prompt

```bash
# Create a prompt file
cat > .cursor/prompts/my-task.md << 'EOF'
---
agent_role: executor
max_steps: 5
goal: Create a simple function
---

Create a TypeScript function that returns "Hello, World!"
EOF

# LocalPromptWatcher will:
# 1. Detect the new file
# 2. POST to /api/local/prompt-submit
# 3. Track job_id in .metadata.json

# Wait for response in .cursor/responses/
watch -n 1 'ls -la .cursor/responses/'

# Git Auto-Commit will auto-commit when response appears
git log --oneline | head -3
```

## Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PLATFORM_ADMIN_TOKEN` | (none) | **Required** for API authentication |
| `ORCHESTRATOR_URL` | http://localhost:3011 | Orchestrator health server |
| `CURSOR_DIR` | .cursor | Working directory for prompts/responses |
| `LLM_GATEWAY_URL` | http://localhost:3010 | LLM Gateway for Claude execution |

### Service Registry Configuration

**File:** `config/agent-services.yaml` or environment variables

```yaml
services:
  cursor:
    url: "http://localhost:5001"
    type: "http"
    timeout_ms: 120000
    
  claude:
    url: "http://localhost:3010"
    type: "http"
    timeout_ms: 30000
    
  copilot:
    url: "http://localhost:5003"
    type: "http"
    timeout_ms: 60000
```

Override via environment:
```bash
export CURSOR_SERVICE_URL="http://192.168.1.100:5001"
export CLAUDE_SERVICE_URL="http://localhost:3010"
```

## Prompt Format

### Frontmatter (YAML)

```md
---
agent_role: executor        # 'executor', 'architect', 'reviewer'
max_steps: 5               # Max iterations before completion
goal: "What are you trying to achieve?"
priority: 50000            # Job priority (0-100000)
context:                   # Additional context
  project: "opsly"
  domain: "orchestration"
---

# Prompt Body

Your actual prompt/task here.
Can span multiple paragraphs.
```

### Valid agent_role values:
- `executor` → Cursor IDE (local_cursor)
- `architect` → Claude via LLM Gateway (local_claude)
- `reviewer` → (future) Code review agent
- `validator` → (future) QA validation

## Testing

### E2E Test Script

```bash
# Test the full flow
./scripts/test-local-agent-e2e.sh

# With custom settings
CURSOR_DIR=.cursor \
ORCHESTRATOR_URL=http://localhost:3011 \
PLATFORM_ADMIN_TOKEN="local-dev" \
./scripts/test-local-agent-e2e.sh
```

### Manual Testing

```bash
# 1. Create test prompt
echo '---
agent_role: executor
max_steps: 5
---

Create test.txt with "Hello"' > .cursor/prompts/manual-test.md

# 2. Monitor response
watch -n 1 'ls -la .cursor/responses/'

# 3. Verify git commit
git log --oneline | head -1
```

## Architecture Diagrams

### Component Interaction

```
┌──────────────────┐
│ .cursor/prompts/ │
│  └─ task.md      │
└────────┬─────────┘
         │
         ↓ (LocalPromptWatcher)
┌──────────────────────────────────┐
│ Orchestrator Health Server       │
│ /api/local/prompt-submit         │
└────────┬────────────────────────┘
         │ enqueueLocalAgentJob()
         ↓
┌──────────────────────────────────┐
│ BullMQ Queue: local-agents       │
└────────┬────────────────────────┘
         │ job.name = local_cursor
         ↓
┌──────────────────────────────────┐
│ Unified Local Agent Worker       │
│ startLocalAgentsUnifiedWorker()   │
└────────┬────────────────────────┘
         │ HTTP POST
         ↓
┌──────────────────────────────────┐
│ Cursor Agent Service (5001)      │
│ Opens Cursor IDE, executes       │
└────────┬────────────────────────┘
         │ Returns response
         ↓
┌──────────────────────────────────┐
│ .cursor/responses/               │
│  └─ response-{id}.md             │
└────────┬────────────────────────┘
         │ (Git Auto-Commit)
         ↓
    git commit + push
```

### Execution Timeline

```
t=0s   User creates .cursor/prompts/task.md
t=1s   LocalPromptWatcher detects file
t=2s   POST /api/local/prompt-submit
t=3s   Job enqueued to local-agents
t=4s   Worker picks up job
t=5s   HTTP POST to Cursor service
t=6s   Cursor IDE opens with prompt
t=10s  User executes in Cursor
t=60s  Response written to .cursor/responses/
t=61s  Git Auto-Commit detects response
t=62s  git commit + git push
t=63s  Branch updated
```

## Troubleshooting

### Issue: "PLATFORM_ADMIN_TOKEN not set"

```bash
export PLATFORM_ADMIN_TOKEN="local-dev"
```

### Issue: "Orchestrator not responding"

```bash
# Check if running
curl http://localhost:3011/health

# Start if needed
npm run dev --workspace=@intcloudsysops/orchestrator
```

### Issue: "Redis connection refused"

```bash
# Start Redis
redis-server --daemonize yes --port 6379

# Verify
redis-cli ping  # Should return PONG
```

### Issue: "No response received (timeout)"

1. Check Cursor Agent Service is running: `npx tsx scripts/cursor-agent-service.ts`
2. Verify service is listening: `curl http://localhost:5001/health`
3. Check `.cursor/responses/` permissions
4. Look at service logs for errors

### Issue: "Response not auto-committed"

1. Verify git repo: `git status`
2. Check auto-commit daemon is running
3. Check `.cursor/responses/` has correct permissions
4. Look at daemon logs: `tail -f /tmp/git-auto-commit.log`

## Advanced Usage

### Remote Agent Services

To run agent services on different machines:

```bash
# On remote machine (192.168.1.100)
npx tsx scripts/cursor-agent-service.ts --port 5001

# On orchestrator machine
export CURSOR_SERVICE_URL="http://192.168.1.100:5001"
npm run dev --workspace=@intcloudsysops/orchestrator
```

### Docker Deployment

```bash
# dockerfile for cursor-agent-service
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
CMD ["npx", "tsx", "scripts/cursor-agent-service.ts", "--port", "5001"]

# docker-compose override
services:
  cursor-agent:
    image: opsly/cursor-agent:latest
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
```

### Systemd Integration

Create `/etc/systemd/system/cursor-agent.service`:

```ini
[Unit]
Description=Cursor Agent Service
After=network.target

[Service]
Type=simple
User=opsly
WorkingDirectory=/opt/opsly
ExecStart=/usr/bin/npx tsx scripts/cursor-agent-service.ts --port 5001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable cursor-agent
sudo systemctl start cursor-agent
```

## See Also

- **AGENTS.md** — Current session state and next steps
- **VISION.md** — Product vision and Guardian Grid strategy
- **docs/ORCHESTRATOR.md** — Orchestrator architecture
- **docs/OPENCLAW-ARCHITECTURE.md** — OpenClaw framework
