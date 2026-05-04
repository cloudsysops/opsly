---
status: active
owner: operations
last_update: 2026-05-04
---

# Autonomous Iteration System — Phase 2

Opsly's autonomous iteration enables agents to:
1. **Execute** a task (Phase 1: LocalPromptWatcher)
2. **Analyze** the result (Phase 2: IterationManager)
3. **Learn** from patterns (Phase 2: AgentTrainer)
4. **Iterate** automatically toward completion (Phase 2: Autonomous Loop)

## Architecture Overview

```
LocalPromptWatcher (detects .cursor/prompts/)
    ↓
LocalAgentQueue → Agent Service (HTTP)
    ↓
Result in .cursor/responses/
    ↓
IterationOrchestrator analyzes
    ├─ Has errors? → ErrorRefinementPrompt
    ├─ Incomplete? → CompletionPrompt
    └─ Complete? → ConfirmationPrompt
    ↓
AgentTrainer records execution
    ├─ Pattern analysis
    ├─ Success rate tracking
    └─ Performance trends
    ↓
Next iteration (if applicable)
    ↓
Auto-commit when complete
```

## Phase 2 Components

### 1. IterationOrchestrator

**File:** `apps/orchestrator/src/lib/iteration/iteration-orchestrator.ts`

**Responsibility:** Manages the full iteration lifecycle

**Key Methods:**
```typescript
// Initialize a new session
async initializeSession(
  jobId,
  taskGoal,
  initialPrompt,
  agentRole,
  maxIterations = 5
): Promise<IterationState>

// Record result and get next action
async recordResult(
  jobId,
  result,
  durationMs
): Promise<{ should_iterate, next_prompt, reasoning }>

// Get session state and history
async getState(jobId): Promise<IterationState>
async getHistory(jobId): Promise<IterationHistory[]>
async getSummary(jobId): Promise<SessionSummary>
```

**Example Usage:**
```typescript
const orchestrator = new IterationOrchestrator();

// Start session
const state = await orchestrator.initializeSession(
  'job-123',
  'Create a user registration API endpoint',
  'Build a POST /api/users endpoint...',
  'cursor',
  5 // max iterations
);

// After agent executes and returns result:
const next = await orchestrator.recordResult(
  'job-123',
  result,
  2500 // duration in ms
);

if (next.should_iterate) {
  // Submit next_prompt to orchestrator for another iteration
  await enqueueLocalAgentJob({
    type: 'local_cursor',
    prompt_body: next.next_prompt,
    request_id: `job-123-iter-${state.current_iteration}`
  });
}
```

### 2. AgentTrainer

**File:** `apps/orchestrator/src/lib/training/agent-trainer.ts`

**Responsibility:** Records and analyzes execution patterns

**Key Methods:**
```typescript
// Record execution for training
async recordExecution(record: ExecutionRecord): Promise<void>

// Generate pattern analysis
async generatePatterns(): Promise<TrainerReport>

// Get patterns for specific task
async getPatternsFor(taskKeyword: string): Promise<AgentPattern[]>

// Get execution records
async getRecords(limit?: number): Promise<ExecutionRecord[]>
```

**Output Files:**
- `.cursor/training/execution-records.json` — Raw execution history
- `.cursor/training/trainer-report.json` — Pattern analysis and trends

**Example Report:**
```json
{
  "generated_at": "2026-05-04T...",
  "total_executions": 42,
  "patterns": [
    {
      "agent_role": "cursor",
      "task_pattern": "api.*route.*handler",
      "success_rate": 0.85,
      "avg_iterations": 2.3,
      "common_errors": ["missing_error_handling", "no_validation"],
      "typical_sequence": ["create_handler", "add_validation", "add_types"],
      "confidence": 0.9
    }
  ],
  "improvements": {
    "cursor": {
      "success_rate_trend": "+15%",
      "speed_improvement": "2.1x",
      "quality_score": 0.78
    }
  }
}
```

### 3. PromptSuggester

**File:** `apps/orchestrator/src/lib/iteration/prompt-suggester.ts`

**Responsibility:** Generates next prompts based on analysis

**Decision Logic:**
```
IF max_iterations reached
  → Request task summary
ELSE IF has_errors
  → Generate error refinement prompt
ELSE IF incomplete
  → Suggest next step (types, tests, error handling, docs)
  → Generate completion prompt
ELSE
  → Request confirmation (task complete?)
```

**Example Output:**
```markdown
---
agent_role: cursor
max_steps: 5
---

Continue the task. Next step: Add TypeScript types

Goal: Create a user registration API endpoint

Current code:
\`\`\`
export function registerUser(data) { ... }
\`\`\`

Add proper TypeScript interfaces and type annotations.
```

## Autonomous Iteration Loop (Detailed)

### Round 1: Initial Execution
1. Developer writes: `.cursor/prompts/build-api.md`
2. LocalPromptWatcher detects → enqueues
3. Agent service executes → response to `.cursor/responses/`
4. IterationOrchestrator records result
5. AgentTrainer saves execution record

### Round 2+: Automatic Iteration
1. PromptSuggester analyzes result
2. Decides: error fix? incomplete? complete?
3. Generates next prompt if needed
4. LocalPromptWatcher auto-submits (or script does)
5. Agent executes again
6. Loop continues (max 5 iterations by default)

### Final: Auto-Commit
After task completion or max iterations:
1. IterationOrchestrator marks complete
2. Git auto-commit with summary
3. AgentTrainer generates final patterns
4. Session cleanup

## Integration with LocalPromptWatcher

**Update needed in `scripts/local-prompt-watcher.ts`:**

```typescript
import { IterationOrchestrator } from '../apps/orchestrator/src/lib/iteration/index.js';

async function handlePromptSubmit(promptPath: string) {
  // Parse frontmatter
  const { frontmatter, body } = parseFrontmatter(content);
  
  // Initialize iteration session if max_iterations specified
  if (frontmatter.max_iterations) {
    const orchestrator = new IterationOrchestrator();
    const state = await orchestrator.initializeSession(
      jobId,
      frontmatter.goal || '',
      body,
      frontmatter.agent || 'cursor',
      frontmatter.max_iterations
    );
    // Store session ID in metadata for later tracking
    metadata[jobId].iteration_session = state.job_id;
  }
  
  // Submit to orchestrator
  await submitToOrchestrator(jobId, body, frontmatter);
}

async function handleResponse(jobId: string, result: string, durationMs: number) {
  const metadata = await loadMetadata();
  const sessionId = metadata[jobId]?.iteration_session;
  
  if (sessionId) {
    // Record result and get next action
    const orchestrator = new IterationOrchestrator();
    const next = await orchestrator.recordResult(sessionId, result, durationMs);
    
    if (next.should_iterate) {
      // Auto-submit next prompt
      logger.info(`Auto-iterating: ${next.reasoning}`);
      await submitToOrchestrator(
        `${jobId}-iter-${sessionId}`,
        next.next_prompt,
        { max_iterations: 0 } // Skip further iteration at this level
      );
    } else {
      // Complete session
      await orchestrator.completeSession(sessionId);
      logger.info(`Session ${sessionId} complete: ${next.reasoning}`);
    }
  }
}
```

## Configuration

**Frontmatter for autonomous iteration:**

```yaml
# Single execution (Phase 1)
---
agent: cursor
max_steps: 10
---

# Autonomous iteration (Phase 2)
---
agent: cursor
max_steps: 10
max_iterations: 5    # Enable auto-iteration (up to 5 attempts)
goal: Build a user registration API
---
```

## Monitoring & Observability

### Execution Records (`training/execution-records.json`)
- Raw data for all executions
- Indexed by: job_id, agent_role, timestamp
- Used by trainer to generate patterns

### Trainer Report (`training/trainer-report.json`)
- Pattern analysis (success rates, typical sequences)
- Improvement trends (speed, quality)
- Agent-specific metrics

### Iteration State (`iteration-state/`)
- Per-job state files: `{job_id}.json`
- Tracks: current iteration, history, status
- Used to resume interrupted sessions

### Commands

```bash
# View trainer report
cat .cursor/training/trainer-report.json | jq .

# View specific pattern
cat .cursor/training/trainer-report.json | jq '.patterns[] | select(.task_pattern | contains("api"))'

# Get execution history for a job
node scripts/query-iteration-state.ts job-123

# Reset iteration session
rm .cursor/iteration-state/job-123.json
```

## Success Metrics

**Phase 2 Goals:**
- ✅ AgentTrainer records 20+ executions
- ✅ Patterns extracted (success rates, error types, sequences)
- ✅ Auto-iteration loop stable (3+ turns without human intervention)
- ✅ Agent quality improves measurably (success_rate_trend > +10%)
- ✅ Speed improvement visible (speed_improvement > 1.5x)

**Example success trajectory:**
```
Execution 1:   70% success, 5 min
Execution 2:   75% success, 4.5 min
Execution 3:   85% success, 3 min (pattern detected)
Execution 4:   90% success, 2 min (optimized sequence)
Execution 5:   95% success, 1.5 min (learned best approach)
```

## Troubleshooting

### Session not found
- Verify `.cursor/iteration-state/{job_id}.json` exists
- Check `ITERATION_STATE_DIR` environment variable

### No patterns generated
- Need at least 2-5 executions for each pattern
- Check `.cursor/training/execution-records.json` for data
- Verify AgentTrainer is recording results correctly

### Auto-iteration not triggering
- Verify `max_iterations > 0` in frontmatter
- Check that LocalPromptWatcher is monitoring properly
- Verify IterationOrchestrator.recordResult() called after execution

## Next Steps

1. **Integrate with LocalPromptWatcher** — auto-submit next prompts
2. **Add CLI commands** — query state, reset sessions, view reports
3. **Deploy to VPS** — run orchestrator + workers 24/7
4. **Monitor improvements** — track success rate and speed gains
5. **Extend to multiple agents** — use patterns to select best agent per task

---

**Related:**
- `docs/LOCAL-AGENT-EXECUTION.md` — Phase 1 (execution)
- `docs/01-development/AGENT-PROMPT-QUEUE.md` — Queue structure
- `AGENTS.md` — Session state tracking
