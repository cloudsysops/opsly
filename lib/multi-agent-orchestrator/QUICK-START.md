# 🚀 Quick Start — Multi-Agent Orchestrator

Get up and running with the Multi-Agent Orchestrator in 5 minutes.

---

## Overview

The Multi-Agent Orchestrator is an intelligent task distribution system that coordinates multiple AI agents (Claude Remote, Cursor Local, Codex, OpenCode) to execute tasks efficiently based on cost, speed, and reliability.

```
┌─────────────────┐
│ Task Source     │
├─────────────────┤
│ • Chat (here)   │  → Dispatcher → Orchestrator → Agent Selection
│ • CLI (git)     │                  (Token Opt.)    ↓
│ • Dashboard     │                                (Execute)
│ • Webhooks      │
└─────────────────┘
```

---

## Installation

### 1. Install Package

```bash
npm install @intcloudsysops/multi-agent-orchestrator
```

Or use from source:
```bash
import { MultiAgentOrchestrator } from 'lib/multi-agent-orchestrator';
```

### 2. Initialize Orchestrator

```typescript
import { MultiAgentOrchestrator } from '@intcloudsysops/multi-agent-orchestrator';

const orchestrator = new MultiAgentOrchestrator({
  maxConcurrentTasks: 10,
  enableTokenOptimization: true,
  logLevel: 'info',
  useRegistry: true, // Auto-register all agents
});
```

---

## Usage Examples

### From Chat (This Chat)

```typescript
const { TaskDispatcher } = require('@intcloudsysops/multi-agent-orchestrator');

const dispatcher = new TaskDispatcher();

// Parse natural language
const response = await dispatcher.dispatchFromChat(
  'Ejecuta PESKIDS-1.1 a PESKIDS-1.4'
);

console.log(`Dispatch ID: ${response.dispatchId}`);
console.log(`Estimated cost: $${response.estimatedCost}`);
```

### From CLI (Git Pull on Mac)

```bash
# .cursor-auto-work.json
{
  "task": {
    "id": "PESKIDS-1.1",
    "type": "code_edit",
    "title": "Fix login validation",
    "files_to_edit": ["src/auth/login.ts"],
    "checklist": ["Update validation", "Add tests"]
  }
}

# Git hook triggers:
# .git/hooks/post-checkout → Detects JSON → Dispatches to Cursor Local
```

### From Dashboard

```typescript
// apps/admin/components/multi-agent
import { TaskDispatchForm } from '@/components/multi-agent';

// User types: "PESKIDS-1.1 a PESKIDS-1.3"
// Form sends to POST /api/multi-agent/dispatch-chat
```

### From API

```bash
curl -X POST http://localhost:3001/api/multi-agent/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "source": "api",
    "taskIds": ["PESKIDS-1.1", "PESKIDS-1.2"],
    "preferredAgents": ["claude_remote"]
  }'
```

---

## Dispatch Task

### Step 1: Dispatch

```typescript
const task: Task = {
  taskType: 'code_edit',
  title: 'Fix login validation',
  description: 'Improve validation checks in auth module',
  files_to_edit: ['src/auth/login.ts', 'src/auth/validate.ts'],
  checklist: [
    'Update validation logic',
    'Add test cases',
    'Update documentation'
  ],
  priority: 'high',
  estimatedTokens: 5000,
};

const taskId = await orchestrator.dispatchTask(task);
```

### Step 2: Orchestrator Selects Agent

Algorithm (cost 50% + speed 30% + reliability 20%):
1. **Claude Remote** — Most capable, ~$0.50/task
2. **Codex** — Good, cheaper, ~$0.20/task
3. **Cursor Local** — FREE ✅, fastest for simple tasks
4. **OpenCode** — Cheapest, ~$0.05/task

**Example Selection:**
```
Simple fix (10 min) → Cursor Local (FREE) ✓
Complex refactor → Claude Remote (most capable) ✓
Quick code gen → Codex (fast, cheap) ✓
Testing on budget → OpenCode (lowest cost) ✓
```

### Step 3: Execute Task

Agent receives task and:
1. Reads files to edit
2. Plans changes
3. Modifies code
4. Commits to git
5. Creates PR (if needed)
6. Reports results

### Step 4: Track Results

```typescript
const metrics = orchestrator.getAgentMetrics('claude_remote');
console.log(`Completed: ${metrics.tasksCompleted}`);
console.log(`Failed: ${metrics.tasksFailed}`);
console.log(`Cost: $${metrics.costTotal}`);
console.log(`Avg tokens/task: ${metrics.averageTokensPerTask}`);
```

---

## Monitor in Opsly Moon

Navigate to **http://localhost:3001/multi-agent**

See:
- 🤖 **Agent Status** — Online/offline, performance
- 📊 **Task Metrics** — Executing, queued, completed, failed
- 💰 **Token Budget** — Usage vs. limit, cost projection
- 💡 **Recommendations** — Optimization suggestions
- 📈 **Performance Table** — Per-agent metrics

---

## Configure Agents

### Claude Remote (Cloud)

```bash
# Already available, no setup needed
# Optional: Set session ID for existing session
export CLAUDE_REMOTE_SESSION_ID=session_xxx
```

### Cursor Local (Required for local execution)

```bash
# On your MacBook, verify Cursor is installed
ls ~/.cursor

# Auto-setup script creates:
# .cursor-auto-work.json — Config file
# .cursor/instructions.md — Task instructions
# .git/hooks/post-checkout — Git trigger
```

### Codex (GitHub Copilot - Optional)

```bash
# Get API key from GitHub Copilot
export CODEX_API_KEY=sk_xxxx

# Orchestrator will auto-detect and enable
```

### OpenCode (Self-hosted - Optional)

```bash
# Start model server (e.g., StarCoder)
docker run -p 8000:8000 starcoder:latest

# Or use Ollama
ollama serve

# Set URL
export OPENCODE_MODEL_URL=http://localhost:8000
```

---

## Token Optimization

The system automatically:

1. **Estimates tokens** for each task (based on files_to_edit, checklist)
2. **Calculates cost** per agent
3. **Scores agents** (cost 50%, speed 30%, reliability 20%)
4. **Selects best agent** for task

### Example Cost Comparison

| Agent | Cost/Task | Speed | Use Case |
|-------|-----------|-------|----------|
| Claude Remote | $0.50 | 15 min | Complex refactoring |
| Codex | $0.20 | 10 min | Code generation |
| Cursor Local | FREE | 12 min | Simple fixes |
| OpenCode | $0.05 | 20 min | Budget mode |

### Budget Tracking

```typescript
const summary = tokenOptimizer.getUsageSummary();
console.log(`Monthly budget: $100`);
console.log(`Used: $${summary.totalCostSpent}`);
console.log(`Projected: $${summary.prediction.projectedCostByEndOfMonth}`);
console.log(`Remaining: ${summary.prediction.remainingBudgetPercentage}%`);
```

---

## Error Handling

### Agent Fails → Automatic Retry

```
Task → Claude Remote fails
  ↓
Retry 1 → Codex fails
  ↓
Retry 2 → Cursor Local succeeds ✓
```

Max retries: 2 (falls back to most reliable agent)

### No Agents Available

```
Error: No agents available for task

Solution:
1. Check agent status: curl http://localhost:3001/api/multi-agent/status
2. Enable at least one agent
3. Verify connectivity/configuration
```

---

## Common Tasks

### Execute PESKIDS Tasks

From chat:
```
"Ejecuta PESKIDS-1.1 a PESKIDS-1.4"
```

From curl:
```bash
curl -X POST http://localhost:3001/api/multi-agent/dispatch-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "PESKIDS-1.1 a 1.4"}'
```

### Check Status

```bash
curl http://localhost:3001/api/multi-agent/status | jq .
```

### Dispatch to Specific Agent

```typescript
orchestrator.dispatchTask({
  ...task,
  agentId: 'cursor_local', // Force Cursor
});
```

### Get Metrics

```typescript
// Per-agent
const claude = orchestrator.getAgentMetrics('claude_remote');

// Aggregated
const totals = orchestrator.getAggregatedMetrics();
console.log(`Total cost: $${totals.totalCost}`);
```

---

## Troubleshooting

### No tasks executing

```bash
# Check orchestrator status
curl http://localhost:3001/api/multi-agent/status

# Check if agents are available
# If not, enable at least one agent
```

### Tasks slow

```bash
# Check token optimizer recommendations
curl http://localhost:3001/api/multi-agent/status | jq .tokens.recommendations

# Likely: Distribute to cheaper/faster agents (Cursor, Codex)
```

### Budget exceeded

```bash
# Check projection
curl http://localhost:3001/api/multi-agent/status | \
  jq .tokens.usage.prediction.remainingBudgetPercentage

# Solution: Prefer Cursor Local (FREE) and OpenCode (cheap)
```

### Agent not found

```bash
# List available agents
curl http://localhost:3001/api/multi-agent/status | jq .agents.agents[].id

# Enable missing agent in .env or config
```

---

## Next Steps

1. **Try it now**: Fire a chat task "PESKIDS-1.1"
2. **Check dashboard**: Visit http://localhost:3001/multi-agent
3. **Configure agents**: Verify all agents are enabled
4. **Set budget**: Adjust `monthlyBudgetUSD` if needed
5. **Monitor metrics**: Track cost/performance over time
6. **Add custom agents**: Implement `Agent` interface for your own tools

---

## API Reference

### Status
```
GET /api/multi-agent/status
```

### Dispatch
```
POST /api/multi-agent/dispatch
POST /api/multi-agent/dispatch-chat
```

See `apps/admin/app/api/multi-agent/README.md` for full details.

---

## Support

- **Docs**: `lib/multi-agent-orchestrator/README.md`
- **Components**: `apps/admin/components/multi-agent/README.md`
- **API**: `apps/admin/app/api/multi-agent/README.md`
- **Agents**: `lib/multi-agent-orchestrator/agents/README.md`
- **Governance**: `lib/multi-agent-orchestrator/GOVERNANCE.md`

---

**Last updated:** 2026-08-07  
**Version:** 1.0  
**Maintainer:** Santiago Boteros  
**License:** Opsly Internal
