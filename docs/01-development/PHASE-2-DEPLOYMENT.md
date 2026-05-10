---
status: active
owner: operations
last_update: 2026-05-04
---

# Phase 2 Integration & Deployment Guide

Complete instructions for deploying the autonomous iteration system to production (VPS) and enabling 24/7 autonomous agent execution.

## Architecture Overview (Updated)

```
Developer writes prompt → LocalPromptWatcher detects
  ↓
POST /api/local/prompt-submit
  ↓
Enqueue to local-agents queue (Redis)
  ↓
UnifiedLocalAgentWorker processes:
  1. Initialize iteration session (if max_iterations > 0)
  2. Execute via HTTP agent service
  3. Record result with IterationOrchestrator
  4. Train AgentTrainer on execution
  5. Auto-iterate if needed (via PromptSuggester)
  6. Write response to .cursor/responses/
  ↓
Auto-commit (LocalGitAutoCommit)
  ↓
AgentTrainer generates patterns report
```

## Deployment Checklist

### Step 1: Verify Redis Connection (VPS)

```bash
# VPS
ssh vps-dragon@100.120.151.91

# Check Redis
redis-cli -h localhost ping
# Expected: PONG

# Check queue exists
redis-cli KEYS "*local-agents*"
```

### Step 2: Build Orchestrator

```bash
# Local dev machine (or VPS)
npm run build --workspace=@intcloudsysops/orchestrator

# Verify
ls -la apps/orchestrator/dist/
```

### Step 3: Start Orchestrator (VPS)

**Option A: Control Plane Only (no workers on VPS)**

```bash
# Set env vars
export OPSLY_ORCHESTRATOR_ROLE=control
export REDIS_URL=redis://localhost:6379
export PLATFORM_ADMIN_TOKEN=your-token-here

# Start (in screen or tmux)
cd apps/orchestrator && node dist/index.js
# Expected: "✅ Orchestrator control plane ready on port 3011"
```

**Option B: Control + Worker (handle jobs on VPS)**

```bash
export OPSLY_ORCHESTRATOR_ROLE=worker
export REDIS_URL=redis://localhost:6379
export LOCAL_AGENT_CONCURRENCY=2

cd apps/orchestrator && node dist/index.js
# Expected: "✅ UnifiedLocalAgentWorker ready"
```

### Step 4: Start Agent Services (Local Machines)

**On MacBook (or wherever Cursor/Claude run):**

```bash
# Terminal 1: Cursor Agent Service
npm run opsly:local-cursor-service
# Expected: "🚀 CursorAgent Service listening on :5001"

# Terminal 2: Claude Agent Service (mock or real)
npx tsx scripts/mock-claude-agent.ts
# Expected: "🚀 Claude Agent Service listening on :5002"
```

**Config agent services in orchestrator:**

Create `config/agent-services.json`:
```json
{
  "cursor": {
    "url": "http://192.168.1.100:5001",
    "type": "http",
    "timeout_ms": 60000,
    "retries": 2
  },
  "claude": {
    "url": "http://192.168.1.100:5002",
    "type": "http",
    "timeout_ms": 60000,
    "retries": 2
  },
  "copilot": {
    "url": "http://localhost:5003",
    "type": "http",
    "timeout_ms": 60000,
    "retries": 1
  },
  "opencode": {
    "url": "http://api.opencode.dev",
    "type": "http",
    "timeout_ms": 60000,
    "retries": 1
  }
}
```

**Load agent services in orchestrator:**

In `apps/orchestrator/src/index.ts`:
```typescript
import agentServices from '../../config/agent-services.json' assert { type: 'json' };

// When starting UnifiedLocalAgentWorker:
const worker = new UnifiedLocalAgentWorker('.cursor', agentServices);
await worker.start();
```

### Step 5: Start LocalPromptWatcher (Local Dev Machine)

```bash
export CURSOR_DIR=.cursor
export ORCHESTRATOR_URL=http://localhost:3011  # or VPS IP
export PLATFORM_ADMIN_TOKEN=your-token

npx tsx scripts/local-prompt-watcher.ts
# Expected: "🚀 LocalPromptWatcher monitoring .cursor/prompts/"
```

### Step 6: Test End-to-End

**Create test prompt:**

```bash
cat > .cursor/prompts/test-autonomous-1.md << 'EOF'
---
agent: cursor
max_steps: 10
max_iterations: 3
goal: Create a simple hello world function
---

Create a TypeScript function called greet(name: string) that returns "Hello, {name}!"
Add proper error handling and JSDoc comments.
EOF
```

**Monitor execution:**

```bash
# Terminal 1: Watch responses folder
watch -n 1 'ls -lah .cursor/responses/ | tail -5'

# Terminal 2: Monitor trainer patterns
watch -n 2 'cat .cursor/training/trainer-report.json | jq ".total_executions"'

# Terminal 3: Query iteration state
npx tsx scripts/autonomous-iteration-cli.ts status
```

**Expected output:**
```
✅ test-autonomous-1.md detected
✅ Job enqueued to local-agents queue
✅ Agent executes (2-5 seconds)
✅ Result written to .cursor/responses/
✅ IterationOrchestrator analyzes
✅ [Iteration 1/3] Auto-generate next prompt
✅ [Iteration 2/3] Auto-generate next prompt
✅ [Iteration 3/3] Task complete
✅ Auto-commit: "feat(job-{id}): autonomous iteration 3 turns"
✅ AgentTrainer records execution
```

## CLI Commands

### View Session Status

```bash
# List all sessions
npx tsx scripts/autonomous-iteration-cli.ts status

# Get specific session
npx tsx scripts/autonomous-iteration-cli.ts status job-123

# Expected output:
# 📋 Session: job-123
# Goal: Create a hello world function
# Agent: cursor
# Status: completed
# Iterations: 3/3
```

### View Patterns

```bash
# All patterns
npx tsx scripts/autonomous-iteration-cli.ts patterns

# Filtered by keyword
npx tsx scripts/autonomous-iteration-cli.ts patterns api

# Expected output:
# 📈 Agent Patterns (api)
# Agent: cursor
# Pattern: api.*route.*handler
# Success Rate: 85.0%
# Avg Iterations: 2.3
# Typical Sequence: create_handler → add_validation → add_types
```

### View Trainer Report

```bash
npx tsx scripts/autonomous-iteration-cli.ts report

# Expected output:
# 📊 Trainer Report
# Generated: 2026-05-04T...
# Total Executions: 42
# Patterns Found: 8
# 
# Agent Improvements:
#   cursor
#     Success Rate: +15%
#     Speed: 2.1x
#     Quality: 0.78
```

### Reset Session

```bash
npx tsx scripts/autonomous-iteration-cli.ts reset job-123
# ✅ Session reset: job-123
```

## Monitoring in Production

### Health Check Endpoint

```bash
# Check orchestrator
curl http://localhost:3011/health
# {"status":"ok","role":"worker","queue":"local-agents"}

# Check agent service
curl http://localhost:5001/health
# {"status":"ok","service":"cursor"}
```

### Metrics to Track

```bash
# Queue depth
redis-cli LLEN bull:local-agents:*

# Recent completions
redis-cli LRANGE bull:local-agents:completed 0 -1

# Failed jobs
redis-cli LRANGE bull:local-agents:failed 0 -1
```

### Log Aggregation

```bash
# Orchestrator logs
tail -f /var/log/opsly/orchestrator.log | grep "local_agent\|iteration\|trainer"

# Agent service logs
tail -f /var/log/opsly/cursor-agent.log

# Watch all
tail -f /var/log/opsly/*.log | grep -E "✅|❌|🚀"
```

## Scaling to 24/7 Autonomy

### Single Machine (Development)

```bash
# Start orchestrator (control + worker)
OPSLY_ORCHESTRATOR_ROLE=worker node apps/orchestrator/dist/index.js &

# Start local services
npm run opsly:local-cursor-service &
npx tsx scripts/mock-claude-agent.ts &

# Start watcher
npx tsx scripts/local-prompt-watcher.ts &

# Start auto-commit
npx tsx scripts/local-git-auto-commit.ts &
```

### Distributed (Production on VPS)

```
VPS:
  ├─ Orchestrator (control plane) → Redis
  ├─ LocalPromptWatcher (monitors repo)
  ├─ LocalGitAutoCommit (commits results)
  └─ UnifiedLocalAgentWorker (x2 concurrency)

MacBook (Tailscale):
  ├─ Cursor Agent Service :5001 → VPS Redis
  ├─ Claude Agent Service :5002 → VPS Redis
  └─ [other local services]
```

**VPS Start Script (`scripts/start-production.sh`):**

```bash
#!/bin/bash

set -e

# Env
export REDIS_URL=redis://localhost:6379
export OPSLY_ORCHESTRATOR_ROLE=worker
export LOCAL_AGENT_CONCURRENCY=4
export PLATFORM_ADMIN_TOKEN=${PLATFORM_ADMIN_TOKEN}
export LOG_LEVEL=info

# Build
npm run build --workspace=@intcloudsysops/orchestrator

# Start services
echo "Starting orchestrator..."
cd apps/orchestrator && node dist/index.js &
ORCH_PID=$!

echo "Starting LocalPromptWatcher..."
npx tsx scripts/local-prompt-watcher.ts &
WATCHER_PID=$!

echo "Starting auto-commit daemon..."
npx tsx scripts/local-git-auto-commit.ts &
COMMIT_PID=$!

# Trap signals
trap "kill $ORCH_PID $WATCHER_PID $COMMIT_PID" SIGTERM SIGINT

echo "✅ All services started"
wait
```

## Troubleshooting

### Agent Service Unreachable

```bash
# Check service health
curl http://localhost:5001/health

# Check network (if remote)
ping -c 1 192.168.1.100

# Check Tailscale
tailscale status | grep opsly

# Check firewall
netstat -tlnp | grep 5001
```

### Queue Processing Slow

```bash
# Check queue depth
redis-cli LLEN bull:local-agents:wait

# Check concurrency setting
ps aux | grep UnifiedLocalAgentWorker | wc -l

# Increase concurrency
export LOCAL_AGENT_CONCURRENCY=4
```

### No Patterns Generated

```bash
# Check execution records
ls -lah .cursor/training/execution-records.json

# Check file size (should grow)
du -h .cursor/training/execution-records.json

# View raw records
cat .cursor/training/execution-records.json | jq '.[] | {agent_role, success, iterations}'
```

### Auto-iteration Not Working

```bash
# Check iteration state
ls -la .cursor/iteration-state/

# View specific session
cat .cursor/iteration-state/job-123.json | jq .current_iteration

# Check PromptSuggester logic
# - Is max_iterations > 0 in frontmatter?
# - Did previous execution have errors?
# - Is orchestrator processing recordResult()?
```

## Success Criteria (24/7 Autonomous)

- ✅ LocalPromptWatcher runs without intervention
- ✅ Agent services stable (uptime > 99%)
- ✅ Queue processing consistent (< 5 sec latency)
- ✅ Auto-iterations complete within 5 turns
- ✅ Patterns improving (success_rate_trend > +10%)
- ✅ Auto-commit clean history (descriptive messages)
- ✅ No manual intervention needed

## Next Evolution (Phase 3)

Once Phase 2 is stable:

1. **Multi-Agent Orchestration** — Use learned patterns to select best agent
2. **Cost Optimization** — Route expensive tasks to faster agents
3. **Parallel Execution** — Run multiple agents simultaneously on same task
4. **Human Escalation** — Detect blockages and request help automatically
5. **Continuous Learning** — Update patterns daily, improve models

---

**Related Documentation:**
- `docs/03-agents/AUTONOMOUS-ITERATION.md` — System design
- `docs/03-agents/LOCAL-AGENT-EXECUTION.md` — Phase 1 (execution)
- `AGENTS.md` — Session state
