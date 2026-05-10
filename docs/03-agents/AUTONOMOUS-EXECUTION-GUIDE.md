---
status: active
owner: operations
title: Autonomous Code Execution & Iteration System
last_update: 2026-05-03
---

# Autonomous Code Execution & Iteration System

## Overview

This guide explains the complete **autonomous code generation, validation, and iteration system** that enables:

✅ **Write prompt** → Code generation → Validation → **Auto-iterate if needed** → **Auto-commit when passing**

The system is designed to run **completely autonomously** with minimal human intervention, powered by 5 coordinated daemons running in parallel.

---

## 🏗️ Architecture: 5-Part System

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LocalPromptWatcher                                       │
│    Monitors .cursor/prompts/ → Detects .md files            │
│    → Submits to Orchestrator                                │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (HTTP POST)
┌─────────────────────────────────────────────────────────────┐
│ 2. Orchestrator (3011)                                      │
│    Enqueues job to local-agents queue                       │
│    Routes: executor → Cursor, architect → Claude            │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (BullMQ job)
┌─────────────────────────────────────────────────────────────┐
│ 3. Unified Local Agent Worker                               │
│    HTTP POST to Cursor Service (5001) or LLM Gateway (3010) │
│    Waits for response in .cursor/responses/                 │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (Agent executes)
┌─────────────────────────────────────────────────────────────┐
│ 4. TestValidatorWorker                                      │
│    Runs: npm run type-check → npm run test → npm run build  │
│    Writes: response-{id}.validation.json                    │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (Validation result)
                ┌────┴────┐
                ↓         ↓
          ✅ PASS    ❌ FAIL
            (next)     (if attempt < 3)
                ↓         ↓
        ┌──────────────┐  ┌───────────────────────┐
        │ Auto-Commit  │  │ 5. IterationWatcher   │
        │ (step 6)     │  │    Generates Retry    │
        └──────────────┘  │    Prompt             │
                          │ (attempt N+1)         │
                          └──────────┬────────────┘
                                     ↓
                            Loop back to step 1
```

---

## 🚀 The 5 Daemons

### Daemon 1: LocalPromptWatcher

**File:** `scripts/local-prompt-watcher.ts`

**Responsibility:** Detect new prompts and submit them

```bash
npx tsx scripts/local-prompt-watcher.ts
```

**What it does:**
- Monitors `.cursor/prompts/*.md` with chokidar
- Parses YAML frontmatter (agent_role, max_steps, goal, context)
- POST to `/api/local/prompt-submit` with PLATFORM_ADMIN_TOKEN
- Tracks job_id in `.cursor/prompts/.metadata.json`
- **Automatically retriggers when new retry prompts appear**

**Key insight:** Once a retry prompt is generated, LocalPromptWatcher automatically detects it and resubmits. No manual intervention needed.

---

### Daemon 2: Orchestrator

**Port:** 3011 (Health/API server)

**Responsibility:** Route prompts to workers

```bash
# Already running as part of monorepo
npm run dev --workspace=@intcloudsysops/orchestrator
```

**What it does:**
- Listens on `POST /api/local/prompt-submit`
- Creates job in `local-agents` BullMQ queue
- Routes by agent_role:
  - `executor` → `local_cursor` job
  - `architect` → `local_claude` job
  - Default → `local_cursor`
- Returns `{ job_id, request_id }`

---

### Daemon 3: Unified Local Agent Worker

**Location:** `apps/orchestrator/src/workers/local-agent-http-worker.ts`

**Responsibility:** Invoke agent services (HTTP)

Runs automatically when orchestrator starts.

**What it does:**
- Listens to BullMQ `local-agents` queue
- Routes by job.name:
  - `local_cursor` → HTTP POST to http://localhost:5001/execute
  - `local_claude` → HTTP POST to http://localhost:3010/execute
  - `local_copilot` → HTTP POST to http://localhost:5003/execute
- Waits for response file in `.cursor/responses/`
- Validates response received

**Distributed design:** Can point to remote machines:
```bash
# Local MacBook: start Cursor Service
npx tsx scripts/cursor-agent-service.ts --port 5001

# Orchestrator can be on different machine
export CURSOR_SERVICE_URL="http://192.168.1.100:5001"
```

---

### Daemon 4: TestValidatorWorker

**Location:** `apps/orchestrator/src/workers/TestValidatorWorker.ts`

**Responsibility:** Validate generated code

Starts automatically when orchestrator starts.

**What it does:**
1. Monitors `.cursor/responses/*.md` for new response files
2. Runs validation in sequence:
   ```
   npm run type-check --workspace=detected-workspace
   npm run test --workspace=detected-workspace
   npm run build --workspace=detected-workspace
   ```
3. **Sequential execution:** Later validations only run if earlier ones pass
4. Writes `response-{id}.validation.json` with results
5. Reports:
   - `overall_status`: 'passed' | 'failed' | 'partial'
   - `can_retry`: boolean
   - `next_action`: 'commit' | 'iterate' | 'escalate'
   - `errors`: array of validation errors
   - `attempt`: which attempt number this was (1, 2, or 3)

**Key files:**
- Response: `.cursor/responses/response-{id}.md`
- Validation report: `.cursor/responses/response-{id}.validation.json`

---

### Daemon 5: IterationResponseWatcher

**File:** `scripts/iteration-watch-responses.ts`

**Responsibility:** Auto-generate retry prompts on validation failure

```bash
npx tsx scripts/iteration-watch-responses.ts
```

**What it does:**
1. Monitors `.cursor/responses/*.validation.json` for results
2. Reads validation report
3. If `overall_status === 'failed'`:
   - Checks attempt count
   - If attempt < 3: Generates retry prompt
   - If attempt >= 3: Escalates (logs warning, ready for HelpRequestSystem integration)
4. Uses **IterationManager** to:
   - Analyze error patterns
   - Suggest fixes (type annotations missing, imports needed, etc.)
   - Generate new prompt with context
5. Writes retry prompt: `.cursor/prompts/retry-{id}-attempt-{N}.md`
6. **LocalPromptWatcher automatically detects it and resubmits**

**The loop:** Retry prompt → Resubmit → Execute → Validate → Check again

---

## 🔄 The Complete Flow (End-to-End)

### Scenario: Execute with Validation → Fail → Retry → Pass → Commit

```
Time   Component              Action                          File
────   ─────────────────────  ──────────────────────────────  ────────────────────────────
t=0s   USER                   Create prompt                   .cursor/prompts/task.md
       (YAML frontmatter: agent_role=executor, max_steps=5)

t=1s   LocalPromptWatcher     Detects file
       →  Parses frontmatter
       →  Submits to /api/local/prompt-submit

t=2s   Orchestrator           Receives request
       →  Enqueues local_cursor job
       →  Returns job_id="abc123"

t=3s   LocalPromptWatcher     Updates metadata
                              job "task" → job_id "abc123"   .cursor/prompts/.metadata.json

t=4s   Unified Worker         Picks up job from queue
       →  Prepares request

t=5s   Unified Worker         HTTP POST to Cursor Service
       →  Waits for response

t=10s  Cursor Service         Executes prompt in Cursor IDE
       (on user's MacBook)    → User types/executes code

t=45s  Agent                  Writes response
                              Creates file with code          .cursor/responses/response-abc123.md

t=46s  TestValidatorWorker    Detects response file
       →  Starts validations

t=49s  TestValidatorWorker    type-check: ❌ FAILED
                              Error: "Parameter 'x' missing type"

       (test/build skipped because type-check failed)

t=50s  TestValidatorWorker    Writes validation report        .cursor/responses/response-abc123.validation.json
                              {
                                job_id: "abc123",
                                attempt: 1,
                                overall_status: "failed",
                                next_action: "iterate",
                                errors: [
                                  {type: "type-check", message: "..."}
                                ]
                              }

t=51s  IterationWatcher       Detects validation report
       →  Analyzes errors
       →  Determines: attempt=1 < 3, should retry

t=52s  IterationManager       Generates refactoring prompt     .cursor/prompts/retry-abc123-attempt-2.md
                              "Fix: Add type annotations
                               Parameter 'x' needs type: number
                               ..."

t=53s  LocalPromptWatcher     Detects new retry-*.md file
       →  Submits to /api/local/prompt-submit
       →  Same flow starts again (t=2s onwards)

t=58s  Unified Worker         HTTP POST new request

t=63s  Cursor Service         Executes retry
                              (same Cursor IDE or fresh instance)

t=95s  Agent                  Writes updated response          .cursor/responses/response-abc123.md (updated)

t=96s  TestValidatorWorker    Validates again
       →  type-check: ✅ PASSED (1.2s)
       →  test:       ✅ PASSED (3.5s)
       →  build:      ✅ PASSED (2.1s)

t=103s TestValidatorWorker    Writes validation report        .cursor/responses/response-abc123.validation.json
                              {
                                job_id: "abc123",
                                attempt: 2,
                                overall_status: "passed",
                                next_action: "commit",
                                ...
                              }

t=104s IterationWatcher       Detects validation report
       →  overall_status === "passed"
       →  next_action === "commit"
       →  (does nothing, waiting for AutoCommit)

t=105s LocalGitAutoCommit     Detects successful validation
       →  git add <affected files>
       →  git commit -m "feat(job-abc123): [executor] completed after 2 attempts"
       →  git push origin <branch>

t=108s GIT                     ✅ PUSHED
                              Branch updated with code       GitHub

────────────────────────────────────────────────────────────────────────────────────────────
Result: Code written, validated, iterated, committed autonomously in ~108 seconds
         With 2 attempts (1 failure → retry → success)
```

---

## 💡 Key Design Principles

### 1. **Asynchronous & Decoupled**
Each daemon runs independently, monitoring file system or queue. No tight coupling.

### 2. **Auto-Loop via File System**
Retry prompts are just `.md` files → LocalPromptWatcher sees them → Resubmits. No extra coordination needed.

### 3. **Attempt Tracking**
Validation report includes `attempt: N`. IterationManager checks if `N >= 3` to escalate.

### 4. **Sequential Validation**
Type-check → Test → Build (only if earlier passed). Saves time and provides better error context.

### 5. **Error Analysis**
IterationManager analyzes error messages:
- Missing types → Suggest "Add TypeScript annotations"
- Missing imports → Suggest "Import all dependencies"
- Test failures → Suggest "Review assertions"

### 6. **Human Escalation**
After 3 failed attempts, IterationWatcher logs escalation (ready for HelpRequestSystem integration to create help request).

---

## ✅ Setup Checklist

### Prerequisites
```bash
# 1. Redis running
redis-server --daemonize yes --port 6379

# 2. Environment variables
export PLATFORM_ADMIN_TOKEN="local-dev"
export CURSOR_DIR=".cursor"
export ORCHESTRATOR_URL="http://localhost:3011"

# 3. Monorepo built
npm install
npm run build --workspace=@intcloudsysops/orchestrator
```

### Terminal Setup (5 tabs)

**Terminal 1: Orchestrator**
```bash
npm run dev --workspace=@intcloudsysops/orchestrator
# Starts health server on 3011 + all workers
```

**Terminal 2: Cursor Agent Service** (requires Cursor IDE)
```bash
npx tsx scripts/cursor-agent-service.ts --port 5001
# Listens for prompts from orchestrator
```

**Terminal 3: LocalPromptWatcher**
```bash
PLATFORM_ADMIN_TOKEN="local-dev" \
ORCHESTRATOR_URL="http://localhost:3011" \
npx tsx scripts/local-prompt-watcher.ts
# Detects .cursor/prompts/*.md and submits
```

**Terminal 4: IterationResponseWatcher**
```bash
CURSOR_DIR=".cursor" \
npx tsx scripts/iteration-watch-responses.ts
# Monitors validation results + auto-generates retries
```

**Terminal 5: Git Auto-Commit**
```bash
npx tsx scripts/local-git-auto-commit.ts --auto-push
# Monitors .cursor/responses/ and commits when validation passes
```

---

## 🧪 Testing

### Automatic E2E Test
```bash
./scripts/test-local-agent-e2e.sh
# Creates test prompt → Submits → Monitors response → Verifies flow
```

### Iteration Loop Simulation
```bash
./scripts/test-iteration-loop.sh
# Simulates: validation fail → retry → success → commit
# Shows what happens at each step
```

### Manual Test
```bash
# 1. Create prompt
cat > .cursor/prompts/test.md << 'EOF'
---
agent_role: executor
max_steps: 5
goal: Create a simple function
---

Create a TypeScript function that adds two numbers.
EOF

# 2. Monitor metadata
watch -n 1 'cat .cursor/prompts/.metadata.json | jq .'

# 3. Watch responses
ls -lh .cursor/responses/

# 4. Check git log
git log --oneline | head -5
```

---

## 📊 Data Files

### Prompt Metadata
**File:** `.cursor/prompts/.metadata.json`
```json
{
  "test.md": {
    "jobId": "abc123",
    "filename": "test.md",
    "submittedAt": "2026-05-03T16:54:00Z",
    "status": "pending",
    "agentRole": "executor"
  }
}
```

### Validation Report
**File:** `.cursor/responses/response-{id}.validation.json`
```json
{
  "job_id": "abc123",
  "timestamp": "2026-05-03T16:55:00Z",
  "attempt": 1,
  "validations": [
    {
      "type": "type-check",
      "status": "failed",
      "error": "Parameter 'x' implicitly has type 'any'"
    }
  ],
  "overall_status": "failed",
  "can_retry": true,
  "next_action": "iterate",
  "errors": [
    {
      "type": "type-check",
      "message": "Parameter 'x' implicitly has type 'any'"
    }
  ]
}
```

---

## 🔧 Configuration

### Agent Services Registry
**File:** `apps/orchestrator/src/lib/agent-service-registry.ts`

Services are configurable:
```typescript
const services = {
  cursor: { url: 'http://localhost:5001', type: 'http' },
  claude: { url: 'http://localhost:3010', type: 'http' },
  copilot: { url: 'http://localhost:5003', type: 'http' }
};
```

Override via environment:
```bash
export CURSOR_SERVICE_URL="http://192.168.1.100:5001"
```

---

## 🚀 Scaling

### Single Machine (Development)
All 5 daemons on localhost, all services on same machine.

### Multiple Machines
```bash
# MacBook with Cursor IDE
npx tsx scripts/cursor-agent-service.ts --port 5001

# Cloud server with Orchestrator
export CURSOR_SERVICE_URL="http://192.168.1.100:5001"
npm run dev --workspace=@intcloudsysops/orchestrator

# Claude via LLM Gateway
npx tsx scripts/cursor-agent-service.ts --port 3010
export CLAUDE_SERVICE_URL="http://localhost:3010"
```

### Docker
Each service can be containerized independently:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci
CMD ["npx", "tsx", "scripts/cursor-agent-service.ts", "--port", "5001"]
```

---

## 🎯 Next Steps

### Phase 2 (Intelligence)
- [ ] Agent Trainer: Record patterns, improve suggestions
- [ ] Cost tracking: Log validation time + resource usage
- [ ] Performance metrics: Success rate by agent, by task type
- [ ] Dashboard: Real-time job status visualization

### Phase 3 (Advanced)
- [ ] Parallel execution: Multiple agents on same task
- [ ] Consolidation: Merge best of multiple responses
- [ ] Selective validation: Skip tests for docs-only changes
- [ ] Help Request Integration: Auto-create when escalating

---

## 🆘 Troubleshooting

### Issue: "Orchestrator not responding"
```bash
curl http://localhost:3011/health
# Should see: {"ok": true}
```

### Issue: "Response not received"
- Check Cursor Agent Service is running: `curl http://localhost:5001/health`
- Check `.cursor/responses/` directory exists
- Check LocalPromptWatcher logs for submission errors

### Issue: "Validation never completes"
- Check affected workspaces are detected correctly
- Run `npm run type-check` manually to see actual error
- Check TestValidatorWorker is running (should be auto-started)

### Issue: "Retry prompt not detected"
- Check IterationResponseWatcher is running
- Check `.cursor/prompts/` directory permissions
- Verify retry prompt file created: `ls -la .cursor/prompts/retry-*`

### Issue: "Git commit fails"
- Check git status: `git status`
- Verify branch is set: `git branch -a`
- Check permissions on `.cursor/responses/`

---

## 📚 Related Documentation

- **LOCAL-AGENT-EXECUTION.md** — Basic setup & architecture
- **VALIDATION-AND-ITERATION-SYSTEM.md** — Detailed validation flow
- **docs/01-development/GIT-WORKFLOW.md** — Git standards
- **docs/AGENTS.md** — Session state & agent roles

---

## 📝 Summary

This is a **complete autonomous system** for:
1. **Writing** code (Cursor IDE or Claude)
2. **Validating** code (TypeScript, tests, build)
3. **Iterating** automatically (up to 3 attempts)
4. **Committing** only when passing (zero broken commits)

**Start all 5 daemons, create a prompt, watch it execute autonomously.**

Zero manual intervention needed once validation passes.
