# Task: Complete Task Orchestrator Implementation + Worker Client

**Date:** 2026-05-02  
**Priority:** CRITICAL  
**Status:** pending  
**Estimated:** 3-4 days  
**Branch:** claude/opsly-defense-platform-sC0qH

---

## Executive Summary

Opsly ha pivotado a Guardian Grid (Autonomous Defense Operating System). Para ejecutar tareas autonomamente, necesitamos un **Task Orchestrator** que ya tiene estructura base (Redis queue, Express API). 

Tu tarea: **Completar la implementación + crear worker client para MacBook que ejecute prompts automáticamente.**

Resultado final: Claude pushea prompts → Cursor en MacBook los ejecuta automáticamente → Regresa resultados.

---

## What's Already Done (Don't Redo)

✅ Created: `apps/task-orchestrator/`
✅ Structure: package.json, tsconfig, types, Express server stubs
✅ API endpoints: CRUD tasks, worker registration, heartbeat
✅ DB schema: Supabase tables for tasks, logs, workers
✅ Queue service: Redis + BullMQ skeleton

**What's Missing (Your Work):**

1. ❌ Redis + BullMQ full implementation (queue service)
2. ❌ Supabase schema applied (migrations)
3. ❌ Dashboard UI (Monitor tasks in real-time)
4. ❌ Worker client (Cursor polls for tasks from MacBook)
5. ❌ Tests for API endpoints

---

## Implementation Order (STRICT)

### Phase 1: Infrastructure (Day 1)

**1.1 Apply Supabase Migration**
- [ ] Read: `apps/task-orchestrator/src/db/schema.sql`
- [ ] Apply to jkwykpldnitavhmtuzmo (Supabase project)
- [ ] Verify tables exist: `opsly_tasks`, `opsly_task_logs`, `opsly_workers`
- [ ] Set RLS policies to allow all (for now)

**1.2 Complete Queue Service**
- [ ] File: `apps/task-orchestrator/src/services/queue.ts`
- [ ] Implement missing methods:
  - [ ] `connect()` → Connect to Redis + initialize BullMQ queue
  - [ ] `disconnect()` → Graceful shutdown
  - [ ] `getTask()` → Fetch from Redis (not just BullMQ)
  - [ ] `updateTaskStatus()` → Also sync to Supabase
  - [ ] Add: `syncToSupabase()` → Persist logs to DB every 30s
  
- [ ] Handle edge cases:
  - Reconnection logic if Redis fails
  - Fallback to Supabase if Redis unavailable
  - Transaction safety for status updates

**1.3 Complete Server Endpoints**
- [ ] All POST endpoints should validate input with Zod
- [ ] All responses should include request_id (trace)
- [ ] Error handling: proper HTTP status codes + Sentry
- [ ] Logging: use OpenClaw LLM Gateway for metering

Example for POST /api/tasks:
```typescript
// Every endpoint should:
POST /api/tasks
  Input validation: Zod
  Create task in Redis
  Persist to Supabase async
  Return 201 + task object
  Include trace: { request_id, timestamp, task_id }
```

---

### Phase 2: Dashboard UI (Day 2)

**2.1 Portal Component**
- [ ] Create: `apps/portal/app/orchestrator/page.tsx`
- [ ] Features:
  - [ ] Task list table (pending, executing, completed, failed)
  - [ ] Filters: status, priority, assigned_worker
  - [ ] Search by title
  - [ ] Real-time updates via polling (GET /api/tasks every 5s)
  - [ ] Click task → view details + logs (streaming)
  - [ ] Buttons: cancel, retry, view-result

**2.2 Task Detail View**
- [ ] Modal or sidebar when clicking task
- [ ] Show:
  - [ ] Full prompt
  - [ ] Status timeline
  - [ ] Live logs (scroll to bottom)
  - [ ] Result (if completed)
  - [ ] Error message (if failed)
- [ ] Actions: cancel, retry with params, download logs

**2.3 Worker Status**
- [ ] Show connected workers (polling /api/workers)
- [ ] Status: idle, working, offline
- [ ] Last heartbeat
- [ ] Current task (if working)

---

### Phase 3: Worker Client (Day 3-4) — CRITICAL

This is the **most important part**. This enables full autonomy.

**3.1 Create Worker Client Library**
- [ ] Path: `apps/task-orchestrator/src/client/worker.ts`
- [ ] Class: `OpslyWorker`

```typescript
class OpslyWorker {
  private workerId: string;
  private orchestratorUrl: string;
  private heartbeatInterval: number;

  async start() {
    // Register self
    // Start heartbeat every 30s
    // Polling loop: GET /api/workers/:id/next-task every 10s
  }

  async executeTask(task: Task) {
    // Start Cursor with prompt
    // Capture logs in real-time
    // Post logs every 10s to /api/tasks/:id/log
    // When done: PATCH /api/tasks/:id with result
  }

  async executeCursor(prompt: string): Promise<string> {
    // Call Cursor CLI or SDK
    // Capture output + errors
    // Return result (logs, files changed, etc)
  }

  async heartbeat() {
    // POST /api/workers/:id/heartbeat
    // Include: status, current_task_id
  }
}
```

**3.2 Cursor Integration (For MacBook)**
- [ ] Create executable: `scripts/worker-start-cursor.sh`
- [ ] Usage: `npm run worker:start -- --worker-id=cursor-macbook-cboteros`
- [ ] What it does:
  1. Registers worker with orchestrator
  2. Starts heartbeat loop
  3. Polls for next task every 10s
  4. When task arrives: calls Cursor with prompt
  5. Streams logs back to orchestrator
  6. Auto-commits and pushes when done
  7. Fetches next task

**3.3 Cursor Execution**
- [ ] When worker gets task, execute:
```bash
cursor --execute "$(task.prompt)" \
  --output-dir=/tmp/cursor-execution-$RANDOM \
  --log-file=/tmp/cursor.log
```

- [ ] Capture:
  - [ ] STDOUT/STDERR
  - [ ] Exit code
  - [ ] Files created/modified
  - [ ] Git commits made
  
- [ ] Send logs every 30s:
```
POST /api/tasks/:id/log
{
  level: 'info',
  message: 'stdout line',
  context: { stdout_line_num: 42 }
}
```

**3.4 Cursor Package.json Script**
```json
{
  "scripts": {
    "worker:start": "tsx src/client/worker-cli.ts start",
    "worker:status": "tsx src/client/worker-cli.ts status",
    "worker:stop": "tsx src/client/worker-cli.ts stop"
  }
}
```

---

### Phase 4: Tests (If Time)

- [ ] Unit tests for queue.ts (Redis mock)
- [ ] API endpoint tests (request validation, response format)
- [ ] Worker client tests (task execution mocks)
- [ ] Coverage: >70%

---

## Key Technical Decisions

### A. Redis vs Supabase Sync
**Design:** Redis is primary (low latency), Supabase is persistent backup.
- Task starts → Redis queue immediately
- Every 30s → sync logs to Supabase (batch)
- Worker offline → tasks still in Redis queue
- Server restart → recover tasks from Supabase

### B. Worker Heartbeat
**Design:** Every 30 seconds
- If no heartbeat for 2 min → worker marked offline
- Tasks reassigned to other workers (future)
- Prevent zombie workers

### C. Cursor Execution Isolation
**Design:** Each execution in temporary directory
- `/tmp/cursor-execution-$RANDOM/`
- Logs streamed back to orchestrator
- On completion: git operations (add, commit, push)
- Prevent state pollution between tasks

### D. Error Handling
- Task fails → worker sends error + stacktrace to /api/tasks/:id/log
- If task fails > 3 times → mark as failed_perm (requires manual retry)
- All errors logged to Sentry

---

## File Structure (What to Create)

```
apps/task-orchestrator/
├── src/
│   ├── index.ts ✅
│   ├── server.ts ✅ (complete endpoints)
│   ├── types/task.ts ✅
│   ├── services/
│   │   ├── queue.ts ⚙️ (complete Redis + Supabase sync)
│   │   └── supabase.ts (new — database operations)
│   ├── client/ (new)
│   │   ├── worker.ts (Worker class)
│   │   ├── worker-cli.ts (CLI entry point)
│   │   └── cursor.ts (Cursor integration)
│   ├── db/
│   │   ├── schema.sql ✅
│   │   └── migrations.ts (apply migrations)
│   └── middleware/ (new, if needed)
│       ├── auth.ts
│       └── logging.ts
├── tests/ (new)
│   ├── queue.test.ts
│   ├── api.test.ts
│   └── worker.test.ts
├── package.json ✅
├── tsconfig.json ✅
└── README.md ✅
```

---

## Acceptance Criteria

✅ **Functionality:**
- [ ] Queue service: CRUD tasks, sync to Supabase
- [ ] API: all endpoints working, validated input
- [ ] Dashboard: real-time task monitoring
- [ ] Worker client: executes prompts via Cursor, streams logs

✅ **Quality:**
- [ ] TypeScript strict mode (no `any`)
- [ ] Tests: >70% coverage
- [ ] Error handling: no silent failures
- [ ] Logging: full traceability (request_id)

✅ **Integration:**
- [ ] Works with existing Opsly stack (OpenClaw, Supabase, Redis)
- [ ] Follows project conventions (CLAUDE.md, patterns)
- [ ] Can be deployed to VPS + MacBook simultaneously

✅ **Documentation:**
- [ ] README updated with setup instructions
- [ ] API documented (request/response examples)
- [ ] Worker setup guide for MacBook
- [ ] Example task YAML files

---

## Commands to Know

```bash
# Build
npm run build

# Start (local, needs Redis)
npm run dev

# Start worker (MacBook)
npm run worker:start -- --worker-id=cursor-macbook-cboteros

# Deploy to VPS
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && npm install && npm run build"

# Cleanup
rm -rf dist node_modules && npm install
```

---

## How This Enables Autonomy

1. **Claude (Cloud)** → Writes prompt → `git push` → Task created in queue
2. **Cursor (MacBook)** → Polls `/api/workers/:id/next-task` every 10s
3. **Task found** → Cursor executes prompt automatically
4. **Logs stream** → Real-time updates to dashboard
5. **Completion** → Auto-commit + push to git
6. **Claude verifies** → Reviews results via dashboard

**Result:** Full async autonomy. No waiting. Parallelizable tasks.

---

## If You Get Stuck

- Redis issues? → Check REDIS_HOST, REDIS_PORT in .env
- Cursor can't run? → Verify Cursor CLI installed on MacBook
- Supabase schema fails? → Check project key in .env
- Worker offline? → Check heartbeat endpoint, logs in orchestrator

Ask Claude (me) for help. That's why I'm here.

---

## When You're Done

1. Commit: `git add -A && git commit -m "feat(task-orchestrator): complete implementation + worker client"`
2. Push: `git push origin claude/opsly-defense-platform-sC0qH`
3. Create PR from branch
4. Notify Claude for review + merge

---

**Adelante! 🚀 You've got this. This is the foundation for full Opsly autonomy.**
