---
title: "Opsly 2.0 — Multi-Agent Orchestration Platform"
status: blueprint
date: 2026-05-08
---

# Opsly 2.0: Multi-Agent Orchestration Architecture

## Vision

**Opsly 2.0** is an **autonomous multi-agent development platform** where specialized AI agents (Hashi, Brissa, Lili, Kairo, Aria, Nyx) coordinate to build, test, and deploy software at scale, with Lousa ensuring quality standards and Michelle driving maximum performance capacity.

**Core Principle:** Human approves milestones. Agents execute everything else. Lousa ensures quality. Michelle ensures speed.

---

## Agent Team Structure

### 🧠 Hashi (Architect Agent)
**Role:** Strategic planning, task decomposition, context building

**Responsibilities:**
- Receives user task/milestone
- Analyzes codebase (VISION.md + AGENTS.md + docs)
- Breaks down into subtasks (dependency graph)
- Creates Context Pack for each agent
- Maintains task registry + progress tracking

**Tools:**
- GitHub MCP (read repos, create branches)
- Docs MCP (search codebase + documentation)
- Linear/Jira MCP (task queue)

**Output:** `ACTIVE_TASK.json` + subtask list → broadcast to Brissa, Lili

---

### 💻 Brissa (Developer Agent)
**Role:** Implementation, code generation, branch management

**Responsibilities:**
- Receives subtask from Hashi
- Creates feature branch (`feat/task-{id}`)
- Implements code following specs
- Runs type-check + linting
- Opens draft PR for review
- Commits with conventional messages

**Tools:**
- GitHub MCP (checkout, commit, push)
- Shell MCP (sandboxed: npm, git, type-check only)
- Filesystem MCP (read/write code)
- Supabase/Postgres MCP (migrations)

**Output:** PR on branch → ready for QA + Security

---

### 🧪 Lili (QA/Integration Agent)
**Role:** Testing, validation, error resolution, blocker mitigation

**Responsibilities:**
- Waits for Brissa's PR
- Runs E2E tests (Playwright)
- Runs unit tests (Jest/Vitest)
- Validates database migrations
- Checks performance (latency, memory)
- **If tests fail:** Analyzes error, suggests fix to Brissa, retries
- **If tests pass:** Approves + merges to staging
- Monitors deployment health

**Tools:**
- GitHub MCP (read PR, run workflows)
- Shell MCP (npm test, npm run e2e)
- Prometheus MCP (metrics query)
- Browser MCP (visual regression testing)

**Output:** PR merged OR error log + rollback plan

---

### 🔒 Kairo (Security Agent)
**Role:** Risk assessment, dependency audit, code review for vulnerabilities

**Responsibilities:**
- Scans Brissa's PR for:
  - Hardcoded secrets (fail if found)
  - SQL injection risks (flag dynamic queries)
  - Authentication bypass vectors
  - Dependency vulnerabilities
- Reviews MCP tool usage (sandbox violations?)
- Approves PROD deploys only if zero HIGH risks

**Tools:**
- GitHub MCP (read commits, request changes)
- Snyk/OWASP MCP (dependency audit)
- SAST tools (local scanning)

**Output:** Approved/Blocked with risk summary

---

### 📚 Aria (Docs Agent)
**Role:** Documentation, runbooks, knowledge base

**Responsibilities:**
- After each deploy: updates
  - `AGENTS.md` (session summary)
  - Architecture Decision Records (ADRs)
  - Runbooks for new features
  - API docs (OpenAPI)
- Keeps VISION.md in sync
- Maintains decision log

**Tools:**
- GitHub MCP (commit docs)
- Filesystem MCP (read/write markdown)

**Output:** Updated AGENTS.md + runbooks

---

### 🔍 Nyx (Researcher Agent)
**Role:** Investigation, documentation search, proof-of-concept

**Responsibilities:**
- Investigates unknowns:
  - "How to implement X?"
  - "What's the recommended pattern?"
  - "Does lib Z work with our stack?"
- Searches docs, GitHub issues, Stack Overflow
- Creates spike PRs with findings
- Proposes solutions to Hashi

**Tools:**
- Browser MCP (web search)
- Docs MCP (codebase search)
- GitHub MCP (issue search)

**Output:** Investigation report + recommendation

---

### 👩‍⚖️ Lousa (Interventora/Rectora)
**Role:** Oversight, quality control, enforcement of standards

**Responsibilities:**
- **Monitors all agent performance:**
  - Hashi: Task decomposition time <30 min?
  - Brissa: Code quality + test coverage >80%?
  - Lili: Test pass rate >95%?
  - Kairo: Security scan completion <2 min?
  - Aria: Docs updated after deploy?
  - Nyx: Investigation within SLA?

- **Enforces standards:**
  - Code style violations → BLOCK until fixed
  - Missing tests → REJECT PR
  - Security findings not resolved → ESCALATE
  - Performance degradation >10% → ALERT

- **Quality gates:**
  - All agents must meet SLAs before merge
  - Zero tolerance for hardcoded secrets
  - Coverage thresholds enforced
  - Documentation completeness validated

- **Escalation authority:**
  - Can pause workflow if quality degrades
  - Can request manual code review
  - Can force agent retry with different strategy
  - Can escalate to human if blockers persist

**Tools:**
- Prometheus MCP (metrics + SLA tracking)
- GitHub MCP (PR quality checks)
- Dashboard (real-time agent health)
- Notification MCP (alerts + escalations)

**Output:** Daily reports + enforcement actions + escalations

---

### ⚡ Michelle (Pressure/Performance Optimizer)
**Role:** Drive agents to maximum capacity, optimize performance

**Responsibilities:**
- **Monitors agent throughput:**
  - Hashi: How many tasks/hour? Push for more.
  - Brissa: LOC per hour? Reduce bloat, increase velocity.
  - Lili: Tests per hour? Parallelize, optimize.
  - Kairo: Scans per hour? Reduce false positives.
  - Aria: Docs commits per hour? Automate templates.
  - Nyx: Research cycles per hour? Faster iteration.

- **Pushes performance boundaries:**
  - "Hashi, decompose this in 15 min instead of 30"
  - "Brissa, ship this feature 2 hours faster"
  - "Lili, run tests in parallel, hit 5-min target"
  - "Kairo, reduce scan time by 50%, use caching"
  - "Aria, auto-generate docs from code comments"
  - "Nyx, search 3x faster using indexed knowledge"

- **Implements capacity optimization:**
  - Load balancing (distribute tasks among agents)
  - Caching (avoid redundant work)
  - Parallelization (concurrent agent runs)
  - Resource allocation (CPU, memory, API quotas)
  - Batch processing (group similar tasks)

- **Tracks and reports:**
  - Agent velocity (tasks/hour, LOC/hour, etc.)
  - Throughput improvements (% faster week-over-week)
  - Cost per task (optimize expensive operations)
  - Bottlenecks (where is time being spent?)
  - Recommendations (how to scale further)

**Tools:**
- Prometheus MCP (performance metrics)
- GitHub MCP (workflow analysis)
- ResourceManager MCP (allocation + scaling)
- Dashboard (real-time capacity graphs)
- Analytics MCP (trend analysis)

**Output:** Optimization recommendations + performance reports + scaling strategies

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    Human (You)                                   │
│        Create task: "Build Stripe payment integration"           │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────┐
         │   HASHI (Architect)       │
         │  • Analyze task           │
         │  • Break into subtasks    │
         │  • Create Context Pack    │
         │  • Assign to agents       │
         └───────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    ┌────────┐  ┌────────────┐  ┌──────────┐
    │BRISSA  │  │   LILI     │  │   NYX    │
    │(Dev)   │  │  (QA)      │  │(Researcher)
    │ Code   │  │  Test      │  │ Research │
    └────────┘  └────────────┘  └──────────┘
        │            │               │
        └────────────┼───────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
  ┌──────────────┐      ┌─────────────────┐
  │   KAIRO      │      │     ARIA        │
  │  (Security)  │      │  (Docs)         │
  │ Audit PR     │      │ Update runbook  │
  └──────────────┘      └─────────────────┘
        │                         │
        └────────────┬────────────┘
                     │
        ┌────────────┴──────────────────────────┐
        │                                       │
        ▼                                       ▼
   ┌──────────────┐                 ┌────────────────────┐
   │   LOUSA      │                 │    MICHELLE        │
   │(Interventora)│                 │  (Performance)     │
   │ • Enforce SLAs                 │ • Optimize speed   │
   │ • Quality gates                │ • Push capacity    │
   │ • Escalate                     │ • Load balance     │
   └──────────────┘                 └────────────────────┘
        │                                       │
        └────────────┬──────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ GitHub → main branch  │
         │ Deploy → staging/prod │
         │ Monitoring → alerts   │
         └───────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ You approve milestone  │
        │ & next task            │
        └────────────────────────┘
```

**Agent Team Hierarchy:**
```
┌─────────────────────────────────────────┐
│         HASHI (Architect)               │  ← Orchestration
│         Strategic Direction             │
└─────────────────────────────────────────┘
         │          │        │
    ┌────┴───┬──────┴──┬─────┴────┐
    │        │        │           │
  BRISSA   LILI     NYX    (Execution Layer)
  (Code)  (Test) (Research)
    │        │        │
    └────┬───┴────┬───┘
         │        │
      KAIRO     ARIA    (Validation Layer)
   (Security) (Docs)
    │        │
    └────┬───┴────────┐
         │            │
      LOUSA      MICHELLE     (Control Layer)
  (Quality/    (Performance/
   Standards)  Optimization)
```

**Data Flow:**
```
Task Input
    ↓
Hashi decomposes → Context Pack
    ↓
Brissa codes → PR
    ↓
Lili tests → Results
    ↓
Nyx researches → Recommendations
    ↓
Kairo audits → Approval
    ↓
Aria documents → Updates
    ↓
Lousa validates SLA & gates
    ↓
Michelle optimizes & scales
    ↓
Merge to main → Deploy
```

---

## Core Infrastructure (New Repos)

### 1. `opsly-agent-control` (Private Repo)
Control plane for all agent operations.

```
opsly-agent-control/
├── prompts/
│   ├── arena.md              # Architect system prompt
│   ├── billy.md              # Developer system prompt
│   ├── lili.md               # QA/Integration prompt
│   ├── security.md           # Security review prompt
│   ├── docs.md               # Documentation prompt
│   └── researcher.md         # Research prompt
├── context/
│   ├── VISION.md             # Shared vision (symlink from opsly/VISION.md)
│   ├── AGENTS.md             # Agent state (symlink from opsly/AGENTS.md)
│   ├── ACTIVE_TASK.json      # Current milestone + subtasks
│   └── CONTEXT_PACK.md       # Dynamic context for each agent
├── tools/
│   ├── github-mcp.yaml       # GitHub MCP config (allowlist)
│   ├── filesystem-mcp.yaml   # Sandboxed filesystem access
│   ├── shell-safe-mcp.yaml   # Limited shell (npm, git, type-check only)
│   ├── supabase-mcp.yaml     # Database read/migrations
│   └── browser-mcp.yaml      # Web search + docs
├── jobs/
│   ├── task-queue.json       # Pending tasks for agents
│   ├── completed-tasks.json  # Audit trail
│   └── failed-tasks.json     # With retry count
├── workflows/
│   ├── task-intake.yml       # Validate task + create Context Pack
│   ├── agent-dispatch.yml    # Route to appropriate agent
│   ├── deploy-gates.yml      # Security + QA approval before merge
│   └── monitor-health.yml    # Agent liveness + error tracking
├── security/
│   ├── secret-vault.yaml     # Encrypted secrets (not exposed to agents)
│   ├── audit-log.json        # All agent actions logged
│   └── mcp-allowlist.yaml    # Strict tool access control
└── docs/
    ├── AGENT_API.md          # How agents communicate
    ├── SAFETY_RULES.md       # No RCE, no prod secrets, etc.
    └── OPERATIONS_GUIDE.md   # How to handle agent failures
```

---

### 2. `opsly` (Main Repo - Additions for Opsly 2.0)

```
opsly/
├── apps/
│   ├── agent-orchestrator/          # NEW: Receives tasks, routes to agents
│   │   ├── src/
│   │   │   ├── TaskRouter.ts        # Dispatch logic
│   │   │   ├── ContextBuilder.ts    # Build Context Pack
│   │   │   ├── AgentStatusTracker.ts# Monitor agent progress
│   │   │   └── MergeGate.ts         # Approve merges (security + QA checks)
│   │   └── api/
│   │       ├── POST /tasks          # Intake new task
│   │       ├── GET /tasks/{id}      # Get task status
│   │       └── GET /agents/status   # Health check all agents
│   │
│   └── ... (existing apps)
│
├── .github/workflows/
│   ├── agent-task-intake.yml        # NEW: Accept task input
│   ├── arena-plan.yml               # NEW: Run Arena agent
│   ├── billy-implement.yml          # NEW: Run Billy agent
│   ├── lili-validate.yml            # NEW: Run Lili agent
│   ├── deploy-gates.yml             # NEW: Security + QA before merge
│   └── ... (existing workflows)
│
├── scripts/
│   ├── agent-bootstrap.sh           # NEW: Setup agent environment
│   ├── task-dispatch.sh             # NEW: Create task + notify agents
│   └── ... (existing scripts)
│
└── docs/
    ├── OPSLY_2_0.md                 # NEW: This document
    ├── AGENT_PROMPTS.md             # NEW: Agent instructions
    └── ... (existing docs)
```

---

## Security & Safety Rules

### 🔒 The Golden Rules

**Rule 1: READ ≥ WRITE ≥ SHELL ≥ PROD**

```yaml
Tools by Risk Level:
  READ:   ✅ Default allow
    - GitHub MCP: read repos, list branches, read PRs
    - Docs MCP: search codebase
    - Browser MCP: web search
    - Prometheus MCP: read metrics

  WRITE:  🟡 Explicit permission per task
    - GitHub MCP: create branches, commit, push, open PRs
    - Filesystem MCP: write code only in /src, /tests, /docs
    - Supabase MCP: run migrations (reviewed by human first)

  SHELL:  🔴 Sandboxed only
    - npm run type-check ✅
    - npm run build ✅
    - npm run test ✅
    - git clone/checkout/push ✅
    - cat/grep (read-only) ✅
    - rm, mv, chmod ❌
    - curl, curl to prod ❌
    - bash -c arbitrary ❌

  PROD:   🛑 Human approval mandatory
    - Deploy to production
    - Connect to prod database
    - Rotate secrets
    - Delete data
```

**Rule 2: Secrets Never Exposed**

```typescript
// Arena MCP config
mcp_tools:
  github:
    allowed_actions:
      - read_repo
      - create_branch
      - push_to_branch
    forbidden_actions:
      - access_secrets
      - read_GITHUB_TOKEN
  
  // GITHUB_TOKEN injected at runtime by orchestrator, NOT visible to agent
```

**Rule 3: Task Isolation**

- Each task = new branch
- Each agent run = new context (no memory between tasks)
- Agents cannot access other agents' outputs directly (only via GitHub PRs)
- All agent actions logged + auditable

**Rule 4: Automatic Rollback**

```yaml
If agent fails:
  1. Lili detects test failure
  2. Logs error + context to FAILED_TASKS.json
  3. Suggests fix (if fixable)
  4. If not fixable: notifies human
  5. Task marked as BLOCKED
  6. Human reviews + decides next step
```

---

## Agent Communication Flow

### Task Lifecycle

```
HUMAN INPUT
    ↓
[Arena] Receives: "Build Stripe payment integration"
    ↓ Creates ACTIVE_TASK.json:
    {
      "id": "task-001",
      "title": "Stripe Payment Integration",
      "status": "planning",
      "subtasks": [
        { "id": "sub-001", "title": "Create Stripe MCP", "assignee": "Billy", "status": "pending" },
        { "id": "sub-002", "title": "Write tests", "assignee": "Billy", "status": "pending" },
        { "id": "sub-003", "title": "Run E2E tests", "assignee": "Lili", "status": "pending" },
        { "id": "sub-004", "title": "Security audit", "assignee": "Security", "status": "pending" },
        { "id": "sub-005", "title": "Update docs", "assignee": "Docs", "status": "pending" }
      ]
    }
    ↓ Broadcasts to agents via task queue
    
[Billy] Implements (creates PR: feat/stripe-001)
    ↓ Runs type-check, linting, commit
    ↓ Opens draft PR (marked as WIP)
    
[Lili] Waits for PR, runs tests
    ↓ If fail: suggests fix to Billy, retries
    ↓ If pass: approves PR
    
[Security] Reviews PR commits
    ↓ Checks for hardcoded secrets, SQL injection
    ↓ Approves or blocks with findings
    
[Docs] After approval, updates:
    ↓ AGENTS.md (task summary)
    ↓ API docs (new Stripe endpoints)
    ↓ Runbooks (how to test Stripe locally)
    
[Arena/Lili Merge Gate] Final check:
    ↓ All reviews ✅
    ↓ All tests ✅
    ↓ No secrets 🔒
    ↓ → MERGE to main
    
[Human] Approves milestone
    ↓ Triggers deployment to staging/prod
    ↓ Agents monitor health
    ↓ → COMPLETE task-001
```

---

## Agent Prompts (Summary)

### Arena Prompt (`prompts/arena.md`)

```markdown
# Arena: Strategic Architect

You are the chief architect of Opsly. Your role:

1. **Understand the task.** User says: "Add payment flow."
2. **Analyze codebase.** Read VISION.md, AGENTS.md, existing code.
3. **Break into subtasks:**
   - Research (Stripe API? Webhook handling?)
   - Design (routes, schema, error handling)
   - Implement (Billy: code)
   - Test (Lili: E2E + unit tests)
   - Security (review for RCE, injection, secrets)
   - Docs (runbook, API docs)

4. **Create Context Pack** for each subtask.
5. **Dispatch to agents** via task queue.
6. **Track progress** in ACTIVE_TASK.json.
7. **Escalate blockers** to human if needed.

Tools: GitHub MCP, Docs MCP, Linear MCP
```

### Billy Prompt (`prompts/billy.md`)

```markdown
# Billy: Implementation Agent

You are the developer. Your role:

1. Receive subtask from Arena.
2. **Create branch:** `git checkout -b feat/stripe-001`
3. **Code:** Follow the spec in Context Pack exactly.
4. **Test locally:** npm run type-check, npm run build
5. **Commit:** Use conventional commits (feat:, fix:, docs:)
6. **Push & open PR** (mark as draft if not done)
7. **Wait for Lili** to run tests.
8. **If tests fail:** Read error → suggest fix → let Lili retry
9. **If tests pass:** Ready for merge.

Rules:
- NO hardcoded secrets
- NO shell commands (only git, npm, tsc)
- NO manual database changes (only migrations)

Tools: GitHub MCP, Filesystem MCP, Shell MCP (sandboxed)
```

### Lili Prompt (`prompts/lili.md`)

```markdown
# Lili: QA & Integration Agent

You are the quality guard. Your role:

1. **Watch for Billy's PR** (via GitHub webhook).
2. **Run tests:**
   - npm run type-check
   - npm run test
   - npm run e2e
   - npm run build
3. **Check migrations:** Are they safe? Reversible?
4. **Monitor performance:** Any latency regressions?
5. **If tests fail:**
   - Analyze error logs
   - Suggest fix to Billy (as comment on PR)
   - Wait for retry
6. **If tests pass:**
   - Wait for Security review
   - Request merge when all ✅

Tools: GitHub MCP, Shell MCP (npm test only), Prometheus MCP
```

---

## Implementation Roadmap

### Phase 1: Infrastructure (3-4 days)

- [ ] Create `opsly-agent-control` repo
- [ ] Setup MCP allowlist + security policies
- [ ] Create Arena system prompt
- [ ] Deploy agent-orchestrator service
- [ ] Wire GitHub webhooks for task intake

### Phase 2: Billy (Developer Agent) (2-3 days)

- [ ] Implement Billy prompt
- [ ] Create draft-to-production PR workflow
- [ ] Test with small task (e.g., "Add new API endpoint")
- [ ] Validate code quality (linting, type-check)

### Phase 3: Lili (QA Agent) (2-3 days)

- [ ] Implement Lili prompt
- [ ] Setup test automation (E2E, unit, performance)
- [ ] Create error recovery logic
- [ ] Test with Billy's draft PR

### Phase 4: Security + Docs (1-2 days)

- [ ] Security agent scans PR
- [ ] Docs agent updates AGENTS.md
- [ ] Create merge gate logic

### Phase 5: Full Integration (1-2 days)

- [ ] Wire all agents together
- [ ] Test end-to-end: task → Arena → Billy → Lili → Merge
- [ ] Monitor + logging

---

## ElevenLabs & Media Integration (Bonus)

### Recommended ElevenLabs Features for Opsly 2.0

**1. Voice Notifications**
- Agent completes task → TTS: "Billy finished feature branch, waiting for Lili"
- Deploy success → TTS: "Deployment successful, metrics green"

**2. Voice-Controlled Task Input**
- User: "Opsly, build a webhook handler for Stripe"
- → Transcribed via Whisper
- → Processed by Arena

**3. Agent Voice Personalities**
- Arena: professional, strategic tone
- Billy: technical, direct tone
- Lili: precise, quality-focused tone

### Recommended Tools to Add

**Audio Monitoring:**
- AudioCraft (Meta) for background ambience during long builds
- Whisper API for task voice input

**Video/Animation:**
- For deployment progress: Manim (Python) generates animated status slides
- Export as MP4 → Slack/Discord notification

**Integration with Opsly 2.0:**

```
Opsly 2.0 + Media Layer
├── Voice Notifications (ElevenLabs TTS)
│   ├── Task started
│   ├── Agent progress (Billy pushing, Lili testing)
│   └── Deploy complete
├── Voice Input (Whisper API)
│   ├── "Opsly, add dark mode support"
│   └── Parse → Arena
└── Video Updates (Manim + FFmpeg)
    ├── Deployment progress animation
    └── Test result summary slide
```

---

## Deployment Sequence for Opsly 2.0

```bash
# Step 1: Bootstrap agent control plane
./scripts/agent-bootstrap.sh

# Step 2: Create first task (automated)
npm run task:create -- \
  --title "Implement Phase 5.1: Multi-Model LLM" \
  --assignee "Arena" \
  --sprint "May 15-22"

# Step 3: Watch agents work (real-time logs)
npm run agent:monitor

# Step 4: Approve milestone (human decision point)
npm run task:approve -- --id task-001

# Step 5: Deploy to production
npm run deploy:production

# Step 6: Next task
npm run task:create -- --title "Next feature"
```

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Task completion time | <4 hours | ACTIVE_TASK.json timestamps |
| Code quality | 0 security issues | Security agent scans |
| Test coverage | >80% | Lili reports |
| Deploy success rate | >95% | GitHub Actions logs |
| Human approval time | <30 min | Audit log |

---

## What You Get

✅ **Autonomous development pipeline**  
✅ **Zero bus factor** (agents are your team)  
✅ **Audit trail** (every action logged)  
✅ **Safety first** (no secrets, no RCE, human approval gates)  
✅ **Scale to 10+ agents** (same architecture)  
✅ **Run on any LLM** (Claude, OpenCode, Codex, Cursor via MCP)  

---

## Next Steps

1. **Create `opsly-agent-control` repo** (today)
2. **Write Arena prompt** (today)
3. **Setup MCP Gateway** (tomorrow)
4. **Run first task via Arena** (tomorrow)
5. **Add Billy + Lili** (this week)
6. **Full orchestration** (next week)

---

**Built for:** Continuous autonomous delivery  
**Managed by:** You (approval gates only)  
**Powered by:** Arena + Billy + Lili + Security + Docs agents  
**Status:** Ready to build
