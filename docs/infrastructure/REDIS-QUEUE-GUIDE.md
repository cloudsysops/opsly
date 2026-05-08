---
status: reference
owner: devops
date: 2026-05-08
---

# Redis Queue & Orchestrator Guide

## Quick Overview

- **Message Broker:** Redis (via REDIS_URL from Doppler)
- **Queue Library:** BullMQ (v4.0+)
- **Worker Pattern:** Event-driven job processing
- **Queues:** 15+ (by job type: cursor, n8n, notify, etc.)

---

## Queue Architecture

```
┌─────────────────────────────────────────┐
│  Producer (API, webhooks, scripts)     │
├─────────────────────────────────────────┤
│  Add job to Redis queue (BullMQ)        │
├─────────────────────────────────────────┤
│  Redis (queues, job state, locks)       │
├─────────────────────────────────────────┤
│  Worker (Orchestrator service)          │
│  Processes jobs: attempts 3x on fail    │
└─────────────────────────────────────────┘
```

---

## Queue Types

### Worker Queues (15 active)

```
Queue Name          | Purpose                | Worker
-------------------+-----------------------+------------------
cursor              | Cursor CLI calls      | startCursorWorker
n8n                 | n8n workflow trigger  | startN8nWorker
notify              | Discord notifications | startNotifyWorker
drive               | Google Drive sync     | startDriveWorker
backup              | Tenant backups        | startBackupWorker
health              | Service health checks | startHealthWorker
suspension          | Tenant suspension     | startSuspensionWorker
webhooks            | n8n webhooks          | WebhookWorker
general-events      | Event processing      | EventsWorker
ollama              | Local LLM inference   | OllamaWorker
intent-dispatch     | Agent intent routing  | IntentDispatchWorker
terminal            | SSH command execution | TerminalWorker
local-agents        | Local agent HTTP      | LocalAgentsHTTPWorker
super-orchestrator  | Multi-tenant jobs     | SuperOrchestratorWorker
api-factory         | API rate limiting     | APIFactoryWorker
autonomous-revenue  | Revenue automation    | AutonomousRevenueWorker
agent-classifier    | Agent classification  | AgentClassifierWorker
```

---

## Job Lifecycle

```
1. CREATED
   └─> Job added to queue
       { id, data, attempts, timestamp }

2. WAITING
   └─> Queued, ready for worker
       
3. ACTIVE
   └─> Worker processing
       { startedOn, processedOn, progress }

4. COMPLETED
   └─> Success: result stored (24h TTL)
   
5. FAILED (on error)
   └─> Retry? (max 3 attempts)
       └─> YES → back to WAITING
       └─> NO → FAILED (moved to deadletter queue)
       
6. DELAYED
   └─> Scheduled for future execution
       { delayedUntil timestamp }
       
7. PAUSED
   └─> Manually paused, won't process
```

---

## Monitoring Queues

### Check Queue Depth

```bash
# Connect to Redis
redis-cli -u "$REDIS_URL"

# List all queues
KEYS "*bullmq:queue:*"

# Check queue job counts
HGETALL "bullmq:queue:cursor:id"
HGETALL "bullmq:queue:orchestrator:id"

# Example output:
# Queue: cursor
#   waiting: 5 jobs
#   active: 1 job
#   delayed: 0 jobs
#   failed: 2 jobs
#   completed: 1000+ jobs (archived)
```

### Queue Health Check

```bash
# Total jobs across all queues
redis-cli -u "$REDIS_URL" --eval scripts/queue-stats.lua

# Alert if any queue:
# - waiting jobs > 100 (backing up)
# - failed jobs > 10 (errors)
# - active jobs = 0 for 5+ min (worker down)

# Real-time monitoring
watch 'redis-cli -u "$REDIS_URL" KEYS "*bullmq:queue:*" | wc -l'
```

---

## Job Submission Examples

### Submit via REST API

```bash
# Notify job
curl -X POST https://api.ops.smiletripcare.com/api/jobs/notify \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test notification",
    "channel": "ops-alerts",
    "tenant_slug": "smiletripcare"
  }'

# Response: { job_id: "uuid", queue: "notify", status: "pending" }
```

### Submit via Direct Queue API

```typescript
// In orchestrator or backend code
import { Queue } from 'bullmq';
const connection = { url: process.env.REDIS_URL };

const notifyQueue = new Queue('notify', { connection });
const job = await notifyQueue.add('discord', {
  message: 'Test',
  channel: 'ops-alerts',
  tenant_slug: 'smiletripcare',
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
});

console.log(`Job ${job.id} queued`);
```

---

## Common Issues

### Issue: Queue Stuck (Jobs Not Processing)

**Diagnosis:**
```bash
redis-cli -u "$REDIS_URL" HGETALL "bullmq:queue:cursor"
# If "active" > 0 but jobs not completing for 10+ min:
#   Worker is likely hung or crashed
```

**Fix:**
```bash
# 1. Check if worker is running
docker logs opsly_orchestrator | grep -i "cursor\|worker"

# 2. Restart worker
docker restart opsly_orchestrator

# 3. Manually move stuck job back to waiting
# (requires custom Redis Lua script; contact @devops)
```

---

### Issue: Job Failures (Deadletter Queue Growing)

**Diagnosis:**
```bash
# Check failed jobs
redis-cli -u "$REDIS_URL" LLEN "bullmq:queue:cursor:failed"

# If > 10:
# - Worker is unable to process
# - Check error message in job data
```

**Fix:**
```bash
# 1. Inspect failed job
redis-cli -u "$REDIS_URL" LINDEX "bullmq:queue:cursor:failed" 0

# 2. Check orchestrator logs
docker logs opsly_orchestrator --tail=100 | grep -i "error\|failed"

# 3. Resolve underlying issue (permissions, API key, etc.)

# 4. Retry failed job
# (manual via Redis: move from failed back to waiting)
```

---

### Issue: Queue Memory Usage Growing

**Diagnosis:**
```bash
redis-cli -u "$REDIS_URL" INFO memory
# Check "used_memory_human" and "used_memory_peak"
```

**Solution:**
```bash
# 1. Archive old completed jobs
redis-cli -u "$REDIS_URL" --eval archive-jobs.lua

# 2. Increase REDIS_URL max memory
# (VPS config in Doppler or Redis provider)

# 3. Scale Redis instance
# Contact cloud provider for upgrade
```

---

## Advanced: Custom Job Processing

### Create Custom Worker

```typescript
// apps/orchestrator/src/workers/CustomWorker.ts

import { Worker, Queue } from 'bullmq';

export function startCustomWorker(connection: any) {
  const worker = new Worker('custom-queue', async (job) => {
    console.log(`Processing job ${job.id}`, job.data);
    
    // Your logic here
    try {
      const result = await processMyJob(job.data);
      return result; // Job succeeds
    } catch (error) {
      // Job fails and will retry
      throw error;
    }
  }, { connection });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`, job.returnvalue);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed`, err.message);
  });

  return worker;
}

// Register in apps/orchestrator/src/index.ts
function startAllWorkers() {
  const cleanup: AsyncCleanup[] = [];
  const customWorker = startCustomWorker(connection);
  cleanup.push(async () => customWorker.close());
  // ... other workers
  return cleanup;
}
```

### Submit to Custom Queue

```typescript
const customQueue = new Queue('custom-queue', { connection });
await customQueue.add('process', {
  data: 'your-data',
  options: { metadata: 'value' },
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: true,
  removeOnFail: false, // Keep failed jobs for inspection
});
```

---

## Performance Tuning

### Optimize Job Processing

```typescript
// Good: Fast, idempotent, with retries
const job = await queue.add('fast-task', data, {
  attempts: 3,  // Retry on transient failure
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,  // Don't waste memory
  timeout: 30000,  // 30 sec max per job
});

// Bad: Slow, non-idempotent, no retries
const job = await queue.add('slow-task', data, {
  attempts: 1,  // Fails once, never retries
  removeOnComplete: false,  // Accumulates in Redis
  timeout: 999999,  // No timeout
});
```

### Parallelism

```typescript
// Run multiple worker instances
const worker = new Worker(queueName, processor, {
  connection,
  concurrency: 5,  // Process 5 jobs in parallel
});

// Scale across machines: just spawn more workers
// They'll coordinate via Redis
```

---

## Monitoring Dashboard

### Real-time Queue Status

```bash
# Script: scripts/queue-monitor.sh
while true; do
  echo "=== Queue Status $(date) ==="
  redis-cli -u "$REDIS_URL" <<EOF
HGETALL "bullmq:queue:cursor:id"
HGETALL "bullmq:queue:n8n:id"
HGETALL "bullmq:queue:notify:id"
EOF
  sleep 10
done
```

### Prometheus Metrics (from orchestrator)

```prometheus
bullmq_queue_jobs_count{queue="cursor", status="waiting"}
bullmq_queue_jobs_count{queue="cursor", status="active"}
bullmq_queue_jobs_count{queue="cursor", status="failed"}
bullmq_queue_jobs_duration_seconds{queue="cursor", status="completed"}
```

---

## Disaster Recovery

### Backup Queue State

```bash
# Export all queues
redis-cli -u "$REDIS_URL" --rdb /tmp/redis-dump.rdb

# Backup to S3
aws s3 cp /tmp/redis-dump.rdb s3://opsly-backups/redis-dump-$(date +%s).rdb
```

### Restore Queue State

```bash
# Download backup
aws s3 cp s3://opsly-backups/redis-dump-TIMESTAMP.rdb /tmp/

# Restore (DANGEROUS - will overwrite current queue state)
redis-cli -u "$REDIS_URL" SHUTDOWN
# Copy dump.rdb to Redis data directory
# Restart Redis service
redis-cli PING  # Verify connected
```

---

## References

- BullMQ Docs: https://docs.bullmq.io/
- Redis Docs: https://redis.io/documentation
- Orchestrator Source: apps/orchestrator/src/
- Queue Monitoring: docs/monitoring/QUEUE-METRICS.md (TODO)

---

**Owner:** @devops  
**Last reviewed:** 2026-05-08  
**Next review:** 2026-05-15
