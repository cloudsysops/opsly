---
status: active
owner: operations
last_review: 2026-06-22
---

# Peskids Autonomous Deployment — Agent-Driven (OAR)

> Agents disparan el deployment automáticamente, sin intervención manual

---

## 🤖 Cómo Funciona

```
┌─────────────────────────────────────────────────────────────┐
│ Agent Decision Point (OrchestratorAgent, Planner)          │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ IF peskids_phase1_live AND ssh_available AND client_ready  │
│    THEN: enqueue peskids-deployment job                    │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ BullMQ Queue: peskids-deployment                      │  │
│ │ Job: full-deployment                                  │  │
│ │ Task: validate → N8N → Uptime → smoke-test           │  │
│ └───────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Worker: peskids-deployment-worker.ts                 │  │
│ │ SSH to VPS → Execute deployment steps                │  │
│ │ Report progress (10%, 35%, 65%, 85%, 100%)           │  │
│ └───────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Results: { vpsValid, n8nDeployed, uptimeDeployed }  │  │
│ │ Log to observability + notify client                 │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Agent Implementation

### Step 1: Planner/OrchestratorAgent Evaluates

```typescript
// In apps/orchestrator/src/planner-client.ts or agent handler
interface DeploymentContext {
  peskidsPhase1Live: boolean;
  vpsAccessAvailable: boolean;
  clientApproved: boolean;
  environment: 'prd' | 'staging';
}

async function shouldDeployPeskidsPhase2(ctx: DeploymentContext): Promise<boolean> {
  return ctx.peskidsPhase1Live && ctx.vpsAccessAvailable && ctx.clientApproved;
}
```

### Step 2: Agent Enqueues Job

```typescript
// In any agent handler (OrchestratorAgent, Planner, etc.)
import { Queue } from 'bullmq';

const deploymentQueue = new Queue('peskids-deployment', {
  connection: { host: process.env.REDIS_HOST, port: 6379 }
});

async function deployPeskidsPhase2(request: IntentRequest) {
  const jobId = `peskids-${request.request_id}`;

  const job = await deploymentQueue.add(
    'peskids:full-deployment',
    {
      task: 'full-deployment',
      environment: request.tenant_slug === 'peskids' ? 'prd' : 'staging',
      request_id: request.request_id,
      vpsHost: '100.120.151.91',
      vpsUser: 'root',
    },
    {
      jobId,
      attempts: 1, // No retry on failure (manual intervention needed)
      removeOnComplete: false, // Keep logs for audit
      removeOnFail: false,
    }
  );

  logger.info('Peskids deployment job enqueued', {
    job_id: job.id,
    request_id: request.request_id,
    tenant_id: request.tenant_id,
  });

  return {
    status: 'queued',
    job_id: job.id,
    request_id: request.request_id,
    message: 'Peskids Phase 2 deployment in progress. Check job status for updates.',
  };
}
```

### Step 3: Monitor Job Progress

```typescript
// Agent can poll job status
import { Queue, Job } from 'bullmq';

const deploymentQueue = new Queue('peskids-deployment', {
  connection: { host: process.env.REDIS_HOST, port: 6379 }
});

async function checkDeploymentStatus(jobId: string) {
  const job = await deploymentQueue.getJob(jobId);

  if (!job) {
    return { status: 'not-found', job_id: jobId };
  }

  const progress = job.progress();
  const state = await job.getState();
  const result = job.returnvalue; // Final result if complete

  return {
    status: state,
    progress,
    result,
    timestamp: job.data.timestamp || new Date().toISOString(),
  };
}
```

---

## 🔗 Integration Points

### In OrchestratorAgent

```typescript
// OrchestratorAgent.process()
async process(intent: IntentRequest) {
  // ... other logic ...

  if (intent.action === 'deploy-peskids-phase2') {
    const result = await deployPeskidsPhase2(intent);
    return {
      status: 'queued',
      next_steps: [
        'Wait for job to complete (1-2 hours)',
        'Monitor job status via Redis/BullMQ',
        'Agent will post results to Slack when done',
      ],
      ...result,
    };
  }
}
```

### In Hive QueenBee (Multi-agent)

```typescript
// apps/orchestrator/src/hive/hive-orchestrator.ts
async orchestrateDeployment(objective: Objective) {
  const deploymentTask = {
    type: 'deploy-peskids-phase2',
    subtasks: [
      { name: 'validate-vps', worker: 'operations-bot' },
      { name: 'deploy-n8n', worker: 'infrastructure-bot' },
      { name: 'deploy-uptime', worker: 'infrastructure-bot' },
      { name: 'verify-endpoints', worker: 'qa-bot' },
      { name: 'notify-client', worker: 'comms-bot' },
    ],
  };

  return this.queenBee.assignObjective(deploymentTask);
}
```

---

## 📊 Trigger Scenarios

### Scenario A: Client Ready (Automatic)

```
Condition: Client reaches Phase 2 readiness date
├─ Agent checks: peskids_phase1_live ✓
├─ Agent checks: ssh_access_available ✓
├─ Agent checks: client_approved ✓
└─ ACTION: Enqueue peskids-deployment job

Result: Deployment starts autonomously, no manual action needed
```

### Scenario B: Manual Trigger (Explicit Intent)

```
CLI Command:
  peskids-deploy --env prd --agent

Webhook/API Call:
  POST /api/agent/intent
  {
    "action": "deploy-peskids-phase2",
    "tenant_slug": "peskids",
    "environment": "prd"
  }

Result: Agent enqueues job immediately
```

### Scenario C: Scheduled Deployment

```
Cron/Temporal Workflow:
  "Deploy Peskids Phase 2 tomorrow at 9am"

Scheduler triggers:
  OrchestratorAgent.process({
    action: 'deploy-peskids-phase2',
    scheduled_for: '2026-06-23T09:00:00Z'
  })
```

---

## 🔔 Agent Communication

### Slack Notifications (Webhook)

Agent posts updates as deployment progresses:

```
🟢 Peskids Phase 2 Deployment Started
   Job ID: peskids-abc-123
   Environment: prd
   Progress: 0%

🔄 Validating VPS... (10%)
✓ VPS validation passed
   SSH: OK
   Docker: OK
   Services: 4 running

🔄 Deploying N8N... (35%)
✓ N8N container deployed
   URL: https://n8n-peskids.op-sly.com

🔄 Deploying Uptime Kuma... (65%)
✓ Uptime Kuma deployed
   URL: https://uptime-peskids.op-sly.com

🔄 Running smoke tests... (85%)
✓ All smoke tests passed
   API: 200 ✓
   Landing: 200 ✓
   N8N: 200 ✓
   Uptime: 200 ✓

✅ Peskids Phase 2 Deployment Complete! (100%)
   Duration: 1 hour 35 minutes
   Status: SUCCESS

Next: Client onboarding scheduled for tomorrow
```

### Job Completion Webhook

```typescript
// After job completes, agent can:
if (job.result.status === 'complete') {
  // 1. Post to Slack
  await slackClient.postMessage({
    channel: '#ops',
    text: '✅ Peskids deployment complete',
    blocks: formatDeploymentSummary(job.result),
  });

  // 2. Email client
  await emailClient.send({
    to: 'sierrasantiago90@gmail.com',
    subject: 'Peskids Phase 2 Deployment Complete',
    body: generateClientEmail(job.result),
  });

  // 3. Update AGENTS.md
  await updateAgentsStatus('peskids', {
    phase2_complete: true,
    deployment_date: new Date().toISOString(),
  });

  // 4. Trigger next skill: client onboarding
  await triggerSkill('opsly-client-onboarding', {
    tenant_id: 'peskids',
    features: ['n8n', 'uptime-kuma'],
  });
}
```

---

## ⚠️ Error Handling

### If Job Fails

```typescript
if (job.result.status !== 'complete' || !job.result.smokeTestsPassed) {
  // Log error with full context
  logger.error('Peskids deployment failed', {
    job_id: job.id,
    request_id: job.data.request_id,
    last_success_step: job.data.lastSuccessStep,
    error: job.failedReason,
  });

  // Post to ops channel
  await slackClient.postMessage({
    channel: '#ops-critical',
    text: '❌ Peskids deployment failed - manual intervention needed',
    attachments: [{
      color: 'danger',
      fields: [
        { title: 'Job ID', value: job.id },
        { title: 'Reason', value: job.failedReason },
        { title: 'Action', value: 'Review logs + run manual deployment' },
      ],
    }],
  });

  // Escalate (don't retry automatically)
  return {
    status: 'failed',
    job_id: job.id,
    requires_manual_intervention: true,
    escalate_to: 'ops-team',
  };
}
```

---

## 📋 Pre-Deployment Checklist (Agent Verifies)

Agent should verify these before deploying:

```typescript
interface DeploymentChecklist {
  phase1_live: boolean;           // Landing page up?
  code_merged_to_main: boolean;   // All changes in main branch?
  ssh_credentials: boolean;        // SSH key available?
  vps_reachable: boolean;          // Can ping 100.120.151.91?
  docker_running: boolean;         // Docker daemon active?
  redis_available: boolean;        // Queue can be accessed?
  client_approved: boolean;        // Client gave go-ahead?
  backup_exists: boolean;          // Pre-deployment backup done?
}
```

---

## 🚀 Deployment Timeline (Automated)

```
T+0:00   Agent validates preconditions
T+0:05   Job queued to BullMQ
T+0:10   Worker validates VPS (SSH, Docker, services)
T+0:15   Pull latest code from GitHub
T+0:20   Build/update N8N container
T+0:35   Deploy N8N container (running)
T+1:00   Create N8N workflows (2 workflows)
T+1:05   Deploy Uptime Kuma container
T+1:35   Run smoke tests (all endpoints)
T+1:40   Post results to Slack
T+1:45   Send client email + schedule training
T+1:50   Trigger next skill (onboarding)
```

**Total: 1 hour 50 minutes (fully autonomous)**

---

## 🔗 Related Files

- `apps/orchestrator/src/workers/peskids-deployment-worker.ts` — Worker implementation
- `packages/skills/user/opsly-peskids-deployment/SKILL.md` — Skill definition
- `scripts/peskids-orchestrator.sh` — Manual fallback
- `docs/PESKIDS-GO-LIVE-STATUS.md` — Status reference
- `docs/OPTIMIZATION-ROADMAP-2026-06.md` — Overall roadmap

---

## ✅ Success Criteria

Autonomous deployment is successful when:
1. ✅ Agent enqueues job without manual intervention
2. ✅ Worker executes all steps to completion
3. ✅ Smoke tests pass automatically
4. ✅ Slack + email notifications sent
5. ✅ Client can access all features immediately
6. ✅ Next skill (onboarding) triggered automatically
7. ✅ No manual ops work required

---

*Last updated: 2026-06-22 by Claude (claude-haiku-4-5-20251001)*
