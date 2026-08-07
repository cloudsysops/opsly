# 🤖 Agent Implementations

Agents are the execution engines for the Multi-Agent Orchestrator. Each agent handles task execution differently based on its capabilities and constraints.

---

## Agent Types

### 1. Claude Remote Agent (`claude-remote.ts`)

**Cloud-based execution via Claude Code Remote sessions**

```typescript
import { ClaudeRemoteAgent } from '@intcloudsysops/multi-agent-orchestrator';

const agent = new ClaudeRemoteAgent({
  sessionId: 'session_xxx',
  timeout: 60 * 60 * 1000,
  retryCount: 2,
});
```

**Characteristics:**
- ✅ Most capable (handles all task types)
- 💰 Cost: ~$0.50 per task (variable based on tokens)
- ⏱️ Speed: 15 min average
- 🔄 Max concurrent: 3 tasks
- 📡 Requires: Internet + Claude Code Remote access

**Best for:**
- Complex code refactoring
- Research & analysis
- PR creation & review
- Multi-file changes
- Planning & architecture

---

### 2. Cursor Local Agent (`cursor-local.ts`)

**Local machine execution via Cursor editor**

```typescript
import { CursorLocalAgent } from '@intcloudsysops/multi-agent-orchestrator';

const agent = new CursorLocalAgent({
  workingDirectory: '/path/to/project',
  configFile: '.cursor-auto-work.json',
  timeout: 30 * 60 * 1000,
});
```

**Characteristics:**
- ✅ Free (runs locally)
- 💰 Cost: $0 per task
- ⏱️ Speed: 12 min average
- 🔄 Max concurrent: 1 task (sequential)
- 🖥️ Requires: Local Cursor installation + `.cursor-auto-work.json` support

**Best for:**
- Quick fixes
- Local testing
- Code formatting
- Simple edits
- Development mode

**How it works:**
1. Orchestrator writes task config to `.cursor-auto-work.json`
2. Cursor watches for file changes (via `.cursor/instructions.md`)
3. Cursor executes task automatically
4. Git commits are pushed back

---

### 3. Codex Agent (`codex.ts`)

**GitHub Copilot (requires subscription)**

```typescript
import { CodexAgent } from '@intcloudsysops/multi-agent-orchestrator';

const agent = new CodexAgent({
  apiKey: process.env.CODEX_API_KEY,
  model: 'code-davinci-002',
  maxConcurrent: 5,
});
```

**Characteristics:**
- ✅ Good capability (most code tasks)
- 💰 Cost: ~$0.20 per task
- ⏱️ Speed: 10 min average
- 🔄 Max concurrent: 5 tasks
- 🔑 Requires: GitHub Copilot subscription + API key

**Best for:**
- Code completion
- Boilerplate generation
- Test writing
- Documentation
- Code review suggestions

---

### 4. OpenCode Agent (`opencode.ts`)

**Open-source code models (self-hosted)**

```typescript
import { OpenCodeAgent } from '@intcloudsysops/multi-agent-orchestrator';

const agent = new OpenCodeAgent({
  modelUrl: 'http://localhost:8000',
  modelName: 'starcoder-7b',
  maxConcurrent: 2,
});
```

**Characteristics:**
- ✅ Moderate capability (basic code tasks)
- 💰 Cost: ~$0.05 per task (very low)
- ⏱️ Speed: 20 min average (slower)
- 🔄 Max concurrent: 2 tasks
- 🏠 Requires: Self-hosted model server (Ollama, vLLM, etc.)

**Supported models:**
- StarCoder (7B, 15B)
- CodeLLama (7B, 13B, 34B)
- MPT-7B
- Custom fine-tuned models

**Best for:**
- Cost optimization
- Privacy-sensitive code
- On-premises deployments
- Experimentation
- Integration testing

---

## Agent Registry

The `AgentRegistry` manages all available agents and their lifecycle.

```typescript
import { AgentRegistry } from '@intcloudsysops/multi-agent-orchestrator';

const registry = new AgentRegistry();

// Get all agents
const agents = registry.getEnabledAgents();

// Check availability
const available = registry.isAgentAvailable('claude_remote');

// Get installation instructions
const instructions = registry.getInstallInstructions('codex');

// Check health
await registry.checkHealth('cursor_local');

// Get status
const status = registry.getStatus();
```

---

## Integration with MultiAgentOrchestrator

```typescript
import { MultiAgentOrchestrator } from '@intcloudsysops/multi-agent-orchestrator';

const orchestrator = new MultiAgentOrchestrator({
  maxConcurrentTasks: 10,
  enableTokenOptimization: true,
  useRegistry: true, // Auto-register all agents
});

// Access registry
const registry = orchestrator.getRegistry();
```

---

## Task Flow per Agent

### Claude Remote Flow
```
Task → API call → Claude Code Remote session → 
Git commit + PR → Return result
```

### Cursor Local Flow
```
Task → Write .cursor-auto-work.json → 
Cursor detects → Executes locally → 
Git commit → Return result
```

### Codex Flow
```
Task → API call → Codex model → 
Code suggestion → Git commit → Return result
```

### OpenCode Flow
```
Task → HTTP POST → Model server → 
Generated code → Git commit → Return result
```

---

## Agent Selection Algorithm

The orchestrator selects the best agent using this scoring:

```
Score = (Cost Factor × 0.5) + (Speed Factor × 0.3) + (Reliability Factor × 0.2)
```

**Priority:** Cost > Speed > Reliability

**Example:** For a simple fix:
1. Cursor Local: **90% score** (free, fast, reliable)
2. CodexAgent: **70% score** (cheap, very fast)
3. Claude Remote: **50% score** (most capable but costly)

---

## Adding Custom Agents

Implement the `Agent` interface:

```typescript
import type { Agent, Task, TaskResult } from '../types';

export class MyCustomAgent implements Agent {
  id = 'my_agent';
  type: 'custom' = 'custom';
  costPerTask = 0.10;
  estimatedTaskTime = 15;
  maxConcurrent = 3;
  capabilities = ['code_edit', 'validation'];

  isAvailable(): boolean {
    return true; // Check your conditions
  }

  async execute(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    try {
      // Your execution logic here
      return {
        success: true,
        taskId: task.id,
        agentId: this.id,
        tokensUsed: 0,
        executionTime: Date.now() - startTime,
        cost: 0,
      };
    } catch (error) {
      return {
        success: false,
        taskId: task.id,
        agentId: this.id,
        error: error.message,
        tokensUsed: 0,
        executionTime: Date.now() - startTime,
        cost: 0,
      };
    }
  }
}

// Register it
const registry = new AgentRegistry();
registry.registerAgent(new MyCustomAgent());
```

---

## Environment Variables

```bash
# Claude Remote
CLAUDE_REMOTE_SESSION_ID=session_xxx

# Cursor Local
CURSOR_WORK_DIR=/path/to/project

# Codex
CODEX_API_KEY=sk_xxxx

# OpenCode
OPENCODE_MODEL_URL=http://localhost:8000
```

---

## Metrics & Monitoring

Each agent tracks:
- ✅ Tasks completed
- ❌ Tasks failed
- 📊 Tokens used
- ⏱️ Execution time
- 💰 Cost per task
- 📈 Average tokens/task

```typescript
const metrics = orchestrator.getAgentMetrics('claude_remote');
console.log(`Success rate: ${metrics.tasksCompleted} / ${metrics.tasksCompleted + metrics.tasksFailed}`);
```

---

## Rate Limiting

Per agent:
- **Claude Remote:** 3 concurrent tasks
- **Cursor Local:** 1 concurrent task
- **Codex:** 5 concurrent tasks
- **OpenCode:** 2 concurrent tasks

---

## Fallback & Retry

If an agent fails:
1. Orchestrator tries up to 2 retries with different agents
2. Falls back to most reliable available agent
3. Logs error for debugging

```
Task → Claude Remote fails → Retry with Codex → 
Codex fails → Fallback to Cursor Local → Success
```

---

## Testing Agents

```bash
# Test agent availability
npm run test -- --grep "Agent.*isAvailable"

# Test task execution
npm run test -- --grep "Agent.*execute"

# Test agent registry
npm run test -- --grep "AgentRegistry"

# Run all agent tests
npm run test -- agents/
```

---

## Performance Characteristics

| Agent | Cost | Speed | Capability | Reliability |
|-------|------|-------|------------|-------------|
| Claude Remote | 🔴 High | 🟢 Good | 🟢🟢🟢 | 🟢🟢 |
| Cursor Local | 🟢 Free | 🟢 Good | 🟡 Medium | 🟡 |
| Codex | 🟡 Med | 🟢🟢 Fast | 🟢 Good | 🟢 |
| OpenCode | 🟢 Low | 🔴 Slow | 🟡 Medium | 🟡 |

---

## Troubleshooting

### Claude Remote not available
```bash
# Check session exists
echo $CLAUDE_REMOTE_SESSION_ID

# Verify connectivity
curl https://api.claude.ai/sessions
```

### Cursor Local not executing
```bash
# Check Cursor is installed
ls ~/.cursor

# Verify config file
cat .cursor-auto-work.json

# Check git hooks
ls -la .git/hooks/
```

### Codex slow or expensive
```bash
# Switch to OpenCode for dev/test
# Codex is best for specific code generation tasks
```

### OpenCode connection refused
```bash
# Start model server
docker run -p 8000:8000 starcoder:latest

# Or with Ollama
ollama serve
```

---

## API Reference

See `../types/index.ts` for full TypeScript definitions of:
- `Agent` interface
- `Task` interface  
- `TaskResult` interface
- `AgentMetrics` interface
- `AgentType` union type

---

**Last updated:** 2026-08-07  
**Maintainer:** Santiago Boteros  
**License:** Opsly Internal
