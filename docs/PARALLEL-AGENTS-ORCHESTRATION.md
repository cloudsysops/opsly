# Parallel Agents Orchestration — ADR-025 Implementation

**Date:** 2026-04-15  
**Context:** 6 autonomous agents working in parallel via OpenClaw (BullMQ) to implement token optimization + Ollama routing  
**Timeline:** ~3.5 hours total (2h architecture + 1.5h execution)

---

## Overview

This document explains how **6 jobs are executed in parallel** across Cursor (code agent) and Copilot (config/test agent) without conflicts or duplicated work.

- **Architecture Phase (Architect):** Creates decision documents + job manifest
- **Execution Phase (Cursor 1-3):** Code changes, SSH scripts, token tracking
- **Config Phase (Copilot 4):** Environment variables
- **Validation Phase (Copilot 5-6):** E2E tests + documentation sync

---

## Job Registry

| Job ID  | Type        | Assignee  | Priority | Depends On      | Timeout |
| ------- | ----------- | --------- | -------- | --------------- | ------- |
| **001** | code-task   | Cursor #1 | 0 (HIGH) | none            | 30m     |
| **002** | ssh-script  | Cursor #1 | 0 (HIGH) | none            | 25m     |
| **003** | code-task   | Cursor #2 | 10k      | 002             | 40m     |
| **004** | env-config  | Copilot   | 0 (HIGH) | none            | 5m      |
| **005** | test-suite  | Copilot   | 0 (HIGH) | 001,002,003,004 | 20m     |
| **006** | docs-update | Copilot   | 50k      | 005             | 10m     |

---

## Execution Timeline

```
NOW (Architect)
├─ Write ADR-025 (Decision)
├─ Write Job Manifest (YAML config)
├─ Write Orchestrator Script (BullMQ enqueuer)
└─ ✅ READY

  ↓ Execute: ./scripts/execute-parallel-agents-adr025.sh

PHASE 1 — Cursor Jobs (Parallel, no dependencies)
├─ Job 001: Docker Compose memory limits (30min)
├─ Job 002: Ollama worker setup SSH (25min)
└─ Job 003: Hermes cost tracking code (40min, depends on 002)

PHASE 2 — Copilot Jobs (Parallel after dependencies)
├─ Job 004: Doppler env vars (5min)
├─ Job 005: E2E validation tests (20min, depends on 001-004)
└─ Job 006: Docs + AGENTS.md sync (10min, depends on 005)

COMPLETION (~90 minutes from start of execution)
└─ ✅ All jobs done, 40% token cost reduction active
```

---

## How Agents Pick Up Jobs

### For Cursor (Code Agent)

1. **Check BullMQ queue:**

   ```bash
   redis-cli -n 0 ZRANGE bull:openclaw:pending 0 -1
   ```

   You'll see: `job-001-docker-optimize`, `job-002-ollama-worker-setup`, etc.

2. **Read job payload:**

   ```bash
   redis-cli -n 0 HGET bull:openclaw:job-001-docker-optimize data
   ```

   Payload includes: `title`, `files`, `instructions`, `validation` steps.

3. **Execute the task:**
   - Follow `instructions` field
   - Edit specified `files`
   - Run `validation` script
   - Commit with provided message template

4. **Mark job complete:**
   ```bash
   redis-cli -n 0 ZADD bull:openclaw:completed <timestamp> job-001-docker-optimize
   ```

### For Copilot (Test/Config Agent)

Same flow as Cursor, but for environment configuration and testing:

1. **Job 004** (Doppler): Set secrets in `ops-intcloudsysops/prd` config
2. **Job 005** (E2E Tests): Run validation scripts, verify routing + costs
3. **Job 006** (Docs): Update AGENTS.md + ADR status, push to main

---

## Job Payloads

All payloads are stored as Redis HASHES. Each contains:

```json
{
  "id": "job-NNN-descriptive-name",
  "type": "cursor-code-task | copilot-env-config | copilot-test-suite | ...",
  "adr": "ADR-025 | ADR-024 | ...",
  "request_id": "adr025-parallel-<timestamp>",
  "tenant": "opsly",
  "assignee": "cursor-worker-1 | copilot-validator | ...",
  "task": {
    "title": "Human-readable title",
    "description": "What this accomplishes",
    "files": ["path/to/file1", "path/to/file2"],
    "instructions": "Step-by-step or code change instructions",
    "validation": ["npm run validate-config", "grep pattern file"],
    ...
  }
}
```

---

## Dependency Management

**BullMQ Priority & Dependency Model:**

1. **No hard blocking** — all jobs are enqueued immediately
2. **Priority-based execution** — lower priority score (0) runs before higher (10k, 50k)
3. **Dependency tracking** — stored in `job.depends_on` array for external orchestration

**Timeline guarantees:**

- Jobs 001-002 start immediately (priority=0, no deps)
- Job 003 can start after 002 completes (Cursor sequencing)
- Jobs 004 starts immediately (priority=0, no deps)
- Job 005 waits for 001,002,003,004 (implicit external sequencing)
- Job 006 waits for 005 (explicit in YAML)

---

## Success Criteria

✅ **Job 001 (Docker Limits):** Memory limits applied to 7 services, no OOM in 24h
✅ **Job 002 (Ollama Setup):** Mac2011 worker running, llama3.2 model downloaded
✅ **Job 003 (Token Tracking):** Hermes logs cost_usd=0 for llama_local jobs
✅ **Job 004 (Doppler):** 4 secrets set in prd config
✅ **Job 005 (E2E):** All 5 tests pass (health, routing, cost, fallback, queue)
✅ **Job 006 (Docs):** AGENTS.md updated, commit on main branch

---

## Rollback Plan

If any job fails:

1. **Job 001 fails (Docker):** No impact, rerun safely
2. **Job 002 fails (Ollama):** Use rollback commands in PLAN-OLLAMA-WORKER-2026-04-14.md
3. **Job 003 fails (Hermes):** Revert code changes, no data loss
4. **Job 004 fails (Doppler):** Revert secrets manually or use Doppler UI
5. **Job 005 fails (Tests):** Fix issues found, rerun
6. **Job 006 fails (Docs):** Revert commit, no issue

---

## Monitoring

### Real-Time Queue Status

```bash
# Job counts
redis-cli -n 0 ZCARD bull:openclaw:pending      # Waiting
redis-cli -n 0 ZCARD bull:openclaw:active       # Running
redis-cli -n 0 ZCARD bull:openclaw:completed    # Done

# Specific job status
redis-cli -n 0 HGET bull:openclaw:job-001-docker-optimize status
redis-cli -n 0 HGET bull:openclaw:job-001-docker-optimize progress

# All jobs
redis-cli -n 0 ZRANGE bull:openclaw:pending 0 -1 WITHSCORES
```

### Logs

- **Cursor execution:** IDE logs, GitHub Actions
- **Copilot execution:** Copilot CLI or API logs
- **Orchestrator:** `/opt/opsly/logs/orchestrator.log` (if running)
- **LLM Gateway:** `/opt/opsly/logs/llm-gateway.log` (if running)

### Health Checks

```bash
# All components
./scripts/validate-ai-health-all.sh

# Specific component
curl -sf http://127.0.0.1:3010/health | jq .
curl -sf http://127.0.0.1:3011/health | jq .
curl -sf http://100.80.41.29:11434/api/tags | jq .
```

---

## Reference Files

| File                                                    | Purpose                             |
| ------------------------------------------------------- | ----------------------------------- |
| `docs/adr/ADR-031-token-optimization-ollama-primary.md` | Architecture decision               |
| `config/parallel-agent-jobs.yaml`                       | Full job manifest with all payloads |
| `scripts/execute-parallel-agents-adr025.sh`             | BullMQ enqueuer script              |
| `scripts/verify-token-tracking.sh`                      | Hermes validation helper            |
| `scripts/test-fallback-claude.sh`                       | Fallback scenario test              |
| `docs/PLAN-OLLAMA-WORKER-2026-04-14.md`                 | Detailed ADR-024 phases             |
| `docs/AGENTS.md`                                        | Session state + decisions log       |

---

## Starting Orchestration

```bash
cd /opt/opsly

# Dry-run: see what would be enqueued
./scripts/execute-parallel-agents-adr025.sh --dry-run

# EXECUTE: enqueue all 6 jobs to BullMQ
./scripts/execute-parallel-agents-adr025.sh

# Monitor
redis-cli -n 0 ZRANGE bull:openclaw:pending 0 -1
```

---

## Troubleshooting

### "redis-cli not found"

```bash
# Install redis-tools (Debian/Ubuntu)
apt-get install redis-tools

# OR use Docker
docker exec opsly-redis redis-cli -n 0 ZRANGE bull:openclaw:pending 0 -1
```

### "Job stuck in pending"

1. Check Cursor/Copilot agent is running
2. Verify worker process: `ps aux | grep orchestrator`
3. Check logs for error messages
4. Re-enqueue job: `./scripts/execute-parallel-agents-adr025.sh`

### "Cost tracking not working"

1. Verify hermes.ts has cost_usd field
2. Check llm-gateway logs: `grep -i cost logs/llm-gateway.log`
3. Query Supabase: `SELECT * FROM platform.usage_events LIMIT 1`

### "Ollama fallback not triggered"

1. Manually stop Ollama: `docker compose down ollama`
2. Enqueue test job
3. Check gateway logs for fallback message
4. Restart Ollama: `docker compose up -d ollama`

---

## Next Steps After Completion

1. **Monitor 24h:** Watch cAdvisor for OOM, CPU spikes
2. **Measure savings:** Query usage_events for 40% cost reduction verification
3. **Plan parallel work:** Use same pattern for NotebookLM (ADR-026)
4. **Document lessons:** Update `docs/AGENTS-GUIDE.md` with what worked

---

**Status:** READY FOR EXECUTION  
**Created:** 2026-04-15  
**Last Updated:** 2026-04-15
