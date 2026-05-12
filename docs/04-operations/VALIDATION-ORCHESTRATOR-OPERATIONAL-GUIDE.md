# ValidationOrchestrator Operational Guide

## Overview

### What is ValidationOrchestrator?

The **ValidationOrchestrator** is a production-critical system managing agent routing feedback in the Opsly platform. It validates code generation responses (type-checks, tests, builds) and makes intelligent routing decisions about whether to commit changes, iterate with refined prompts, or escalate to higher-tier agents.

**Core responsibilities:**

- Validate generated code against type-check, test, and build requirements
- Track agent performance metrics across all roles and intents
- Route feedback loops to improve prompt quality and agent accuracy
- Monitor escalation rates and validation latency
- Alert operations on health threshold violations

### Who Operates It?

- **OpsAgent** — primary operational owner, health monitoring, escalation management
- **Reliability Team** — incident response, performance optimization, trend analysis
- **Architecture Team** — prompt improvement cycles, model tier tuning

### Key Metrics to Monitor (SLOs)

| Metric                      | Target             | Warning     | Critical       |
| --------------------------- | ------------------ | ----------- | -------------- |
| **Escalation Rate**         | <3%                | >10%        | >20%           |
| **Avg Validation Time**     | <150ms             | >500ms      | >1000ms        |
| **Validation Success Rate** | >95%               | <90%        | <80%           |
| **Agent Pool Health**       | 4/4 healthy        | 1 unhealthy | 2+ unhealthy   |
| **Prompt Improvement**      | >4% avg            | <2%         | Negative trend |
| **Rollback Rate**           | <1% per 100 cycles | >2%         | >5%            |

### SLO Commitments

- **Escalation Rate SLO:** <5% (measured hourly, 4-week rolling average)
- **Validation Time SLO:** <300ms (p95, per validation cycle)
- **Availability:** 99.5% uptime (excludes planned maintenance windows)

## Quick Start

### Check Orchestrator Status (5 seconds)

**On VPS:**

```bash
ssh vps-dragon@100.120.151.91
docker ps -f "name=orchestrator" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Example output:
# NAMES              STATUS         PORTS
# orchestrator       Up 2 days      127.0.0.1:3011->3011/tcp
```

**From local (dev/staging):**

```bash
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/health

# Expected response:
{
  "status": "ok",
  "service": "orchestrator",
  "role": "queue-only",
  "mode": "worker-enabled",
  "queue_depth": 12,
  "uptime_seconds": 172800
}
```

### View Current Metrics (10 seconds)

```bash
# Fetch latest metrics
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/internal/meta-optimizer/metrics | jq '.summary'

# Extract key metrics
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/internal/meta-optimizer/metrics | jq '.summary | to_entries[] | {intent: .key, escalation_rate: .value.validation_success_rate}'
```

### Access Monitoring Dashboard

- **Local Dev:** http://localhost:3011/dashboard/validation
- **VPS (via Tailscale):** http://100.120.151.91:3011/dashboard/validation
- **Grafana Alerts:** http://vps-dragon:3000/api/ruler/grafana/rules (if Grafana running)

### View Recent Validation Decisions

```bash
# Last 20 decisions with context
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/decisions?limit=20 | jq '.[] | {job_id, action, escalation_reason, validation_time_ms}'
```

### Healthcheck from CI (GitHub Actions)

The automated watchdog runs every 5 minutes:

```bash
# Check if workflow is enabled
gh workflow list --repo cloudsysops/opsly | grep "health-check-validation"

# Manually trigger
gh workflow run health-check-validation-orchestrator.yml \
  --repo cloudsysops/opsly \
  -f skip_discord=false
```

---

## Health Monitoring

### Automated Health Checks (24/7)

The ValidationOrchestrator runs automated health checks every 5 minutes via GitHub Actions.

**Watchdog Script**: `scripts/watchdog-validation-orchestrator.ts`

- Fetches metrics from `/internal/meta-optimizer/metrics`
- Monitors escalation rate and validation time
- Checks agent pool health (ports 5001-5004)
- Sends Discord alerts on warning/critical conditions

### Health Thresholds

| Metric              | Warning     | Critical     | Notes                          |
| ------------------- | ----------- | ------------ | ------------------------------ |
| Escalation Rate     | >10%        | >20%         | % of validations that escalate |
| Avg Validation Time | >500ms      | >1000ms      | Target: <300ms                 |
| Agent Pool          | 1 unhealthy | 2+ unhealthy | Ports 5001-5004 must respond   |

### Metrics Endpoint

```bash
# Fetch current metrics
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/internal/meta-optimizer/metrics

# Example response:
{
  "success": true,
  "summary": {
    "prompt-optimization": {
      "cycles_evaluated": 100,
      "avg_improvement_pct": 5.5,
      "validation_success_rate": 98.5,
      "rollback_count": 1,
      "last_metric_timestamp": "2026-05-04T14:30:00Z"
    }
  },
  "recent_metrics": [...]
}
```

## Alerting

### Discord Notifications

Health check failures are posted to Discord with:

- Severity level (warning/critical)
- Current metric values
- List of issues detected
- Link to monitoring dashboard
- Mention `@OpsAgent` on critical alerts

### GitHub Actions Alerts

**Workflow**: `.github/workflows/health-check-validation-orchestrator.yml`

- Runs every 5 minutes
- Creates issues on critical failures
- Archives results for dashboard integration

### Alert Configuration

Discord webhook is stored as GitHub Actions secret: `DISCORD_WEBHOOK_HEALTH`

To test the webhook:

```bash
curl -X POST "${DISCORD_WEBHOOK_HEALTH}" \
  -H 'Content-Type: application/json' \
  -d '{
    "content": "Test alert from ValidationOrchestrator",
    "embeds": [{
      "title": "Health Check Test",
      "color": 16711680
    }]
  }'
```

## Common Tasks

### Restart Orchestrator Service

**Via Docker (VPS):**

```bash
ssh vps-dragon@100.120.151.91

# Graceful restart (waits for in-flight jobs)
docker restart orchestrator

# Wait for it to be healthy
until curl -s http://localhost:3011/health | jq -e '.status == "ok"' > /dev/null; do
  echo "Waiting for orchestrator..."
  sleep 2
done

echo "Orchestrator is healthy"
```

**Via Docker Compose (full platform):**

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && \
  docker compose -f infra/docker-compose.platform.yml restart orchestrator && \
  sleep 5 && \
  docker compose -f infra/docker-compose.platform.yml ps orchestrator"
```

### Force Feedback Loop Recalculation

When you suspect metrics are stale or want to refresh improvement calculations:

```bash
# Trigger immediate recalculation
curl -X POST \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/admin/recalculate-feedback

# Response will show which prompts were recalculated
{
  "success": true,
  "prompts_recalculated": ["default", "api-generation", "test-generation"],
  "metrics_updated": 847,
  "timestamp": "2026-05-04T14:32:00Z"
}
```

### Reset Agent Performance Scores

**Reset all performance scores (⚠️ use cautiously):**

```bash
# Connect to Supabase (requires credentials)
psql "$SUPABASE_POSTGRES_URL" << 'EOF'
UPDATE validation_metrics SET
  agent_performance_score = 50,
  confidence_level = 0.5,
  last_updated = NOW()
WHERE agent_role IN ('planner', 'executor', 'tool', 'notifier');

SELECT agent_role, COUNT(*) as reset_count
FROM validation_metrics
GROUP BY agent_role;
EOF
```

**Reset for specific agent role only:**

```bash
psql "$SUPABASE_POSTGRES_URL" << 'EOF'
UPDATE validation_metrics SET
  agent_performance_score = 50,
  confidence_level = 0.5,
  last_updated = NOW()
WHERE agent_role = 'executor' AND last_updated < NOW() - INTERVAL '7 days';

SELECT COUNT(*) as rows_updated;
EOF
```

### View Recent Validation Decisions

**Get decisions grouped by action:**

```bash
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '
  group_by(.next_action) |
  map({action: .[0].next_action, count: length}) |
  sort_by(.count) | reverse'

# Output:
# [
#   {"action": "commit", "count": 1247},
#   {"action": "iterate", "count": 95},
#   {"action": "escalate", "count": 23}
# ]
```

**Get decisions for specific time range:**

```bash
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  "http://localhost:3011/api/validation/metrics?since=2026-05-04T00:00:00Z&until=2026-05-04T23:59:59Z" | \
  jq '.[] | {job_id, next_action, escalation_reason, validation_time_ms, timestamp}'
```

### Analyze Agent Escalation Patterns

**Top agents triggering escalations:**

```bash
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '
  [.[] | select(.next_action == "escalate")] |
  group_by(.agent_role) |
  map({agent_role: .[0].agent_role, escalation_count: length, avg_reason: (map(.escalation_reason) | unique)}) |
  sort_by(.escalation_count) | reverse'
```

**Intents with highest escalation rate:**

```bash
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '
  group_by(.intent) |
  map({
    intent: .[0].intent,
    total: length,
    escalations: ([.[] | select(.next_action == "escalate")] | length),
    escalation_rate: ([.[] | select(.next_action == "escalate")] | length) / length * 100
  }) |
  sort_by(.escalation_rate) | reverse | .[0:10]'
```

### Update Model Tier for Agent

When an agent consistently escalates due to insufficient capability:

```bash
# Update agent model tier (via Doppler environment)
doppler run --project ops-intcloudsysops --config prd -- \
  curl -X PATCH \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3011/admin/agent-config/executor \
  -d '{
    "model_tier": "enterprise",
    "reason": "escalation_rate_exceeds_threshold"
  }'
```

### Clear Validation Metrics Cache

**Clear in-memory metrics (will restart counters):**

```bash
curl -X POST \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/admin/clear-metrics-cache

# Response
{
  "success": true,
  "metrics_cleared": 1247,
  "timestamp": "2026-05-04T14:35:00Z"
}
```

---

## Incident Response

### Critical Escalation Rate (>20%)

**Symptoms**:

- More than 20% of validations are escalating to higher-tier agents
- System performance degradation
- Increased costs due to premium model usage

**Response**:

1. Check recent agent performance: `curl http://localhost:3011/internal/meta-optimizer/metrics`
2. Identify which intents are escalating: review `failed_checks` in recent metrics
3. Options:
   - Increase model tier for affected agents (business → enterprise)
   - Improve prompts for low-performing intents
   - Review recent code changes to ValidationOrchestrator
   - Scale up agent pool if resource-constrained

### High Validation Time (>1000ms)

**Symptoms**:

- Slow validation responses
- Queue buildup in job queue
- Timeout errors from clients

**Response**:

1. Check orchestrator queue depth: `curl http://localhost:3011/health`
2. Monitor agent availability: check ports 5001-5004
3. Options:
   - Scale up local agent pool (increase worker count)
   - Reduce validation timeout thresholds
   - Move validation to faster model tier
   - Review concurrent job limits

### Agent Pool Unhealthy

**Symptoms**:

- One or more agents (ports 5001-5004) not responding
- Escalation rate spike as jobs queue
- Job processing delays

**Response**:

1. Check which agents are unhealthy: `scripts/watchdog-validation-orchestrator.ts` output
2. SSH to VPS and check Docker containers:
   ```bash
   ssh vps-dragon@100.120.151.91
   docker ps -f "label=role=agent" --format "table {{.Names}}\t{{.Status}}"
   ```
3. Restart unhealthy agents:
   ```bash
   docker restart opsly-agent-5001
   ```
4. Verify recovery with manual health check

## Troubleshooting

### Issue: Escalation Rate Exceeds 10%

**Symptoms:**

- More than 10% of validation decisions trigger escalation to higher-tier agents
- Increased LLM costs due to premium model usage
- Support ticket volume increase

**Investigation (5 min):**

```bash
# 1. Check which agents are escalating most
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '
  [.[] | select(.next_action == "escalate")] |
  group_by(.agent_role) |
  map({agent: .[0].agent_role, count: length}) |
  sort_by(.count) | reverse'

# 2. Check escalation reasons
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '
  [.[] | select(.next_action == "escalate")] |
  group_by(.escalation_reason) |
  map({reason: .[0].escalation_reason, count: length}) |
  sort_by(.count) | reverse'

# 3. Check which intents are problematic
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '
  [.[] | select(.next_action == "escalate")] |
  group_by(.intent) |
  map({intent: .[0].intent, count: length}) |
  sort_by(.count) | reverse'

# 4. View sample failed validations
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '
  [.[] | select(.next_action == "escalate")] | .[0:3] |
  .[] | {job_id, intent, agent_role, failed_checks}'
```

**Response Options (choose one):**

| Option                      | Timeline  | Impact                           |
| --------------------------- | --------- | -------------------------------- |
| **Improve prompts**         | 1-2 days  | Reduce escalation rate by 30-50% |
| **Increase model tier**     | 30 min    | Higher cost, better accuracy     |
| **Refine validation rules** | 2-4 hours | Avoid false escalations          |
| **Scale agent pool**        | 1 hour    | If resource-constrained          |

**Recommended action sequence:**

1. Profile the 2-3 most-escalated intents
2. Update system prompts in `apps/orchestrator/src/prompts/`
3. Increase model tier for that agent (economy → business → enterprise)
4. Rerun metrics after 1 hour to verify improvement

---

### Issue: Validation Time Exceeds 1000ms (Critical)

**Symptoms:**

- Slow validation responses (>1000ms p95)
- Queue buildup in BullMQ
- Client timeout errors
- User-facing latency increase

**Investigation (5 min):**

```bash
# 1. Check orchestrator queue depth
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/health | jq '{queue_depth, uptime_seconds}'

# 2. Check which validations are slowest
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '
  sort_by(-.validation_time_ms) | .[0:10] |
  .[] | {job_id, intent, validation_time_ms, agent_role}'

# 3. Check agent availability
for port in 5001 5002 5003 5004; do
  curl -s http://localhost:$port/health && echo "Agent port $port: OK" || echo "Agent port $port: DOWN"
done

# 4. Check Docker resource usage
docker stats orchestrator --no-stream | tail -1
```

**Response Options:**

| Option                        | Timeline | Action                                                |
| ----------------------------- | -------- | ----------------------------------------------------- |
| **Reduce validation timeout** | 5 min    | Fail fast, escalate instead of waiting                |
| **Move to faster model**      | 15 min   | Switch model_tier to economy (lower accuracy, faster) |
| **Parallelize checks**        | 2 hours  | Split type-check, tests, build into parallel workers  |
| **Cache validations**         | 4 hours  | Detect duplicate code patterns, return cached result  |
| **Scale up agent pool**       | 1 hour   | Add worker agents, increase BullMQ concurrency        |

**Immediate mitigation:**

```bash
# 1. Reduce queue concurrency temporarily
curl -X PATCH \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/admin/queue-config \
  -d '{"concurrency": 2, "reason": "high_latency_mitigation"}'

# 2. Enable fast-fail for slow jobs
curl -X PATCH \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/admin/validation-config \
  -d '{"validation_timeout_ms": 500, "fast_fail": true}'

# 3. Monitor impact
sleep 30
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '.[-10:] | map(.validation_time_ms) | add/length'
```

---

### Issue: Agent Pool Unhealthy (2+ agents down)

**Symptoms:**

- One or more agent ports (5001-5004) not responding
- Escalation rate spike (from 5% to 15%+)
- Job processing delays
- Error messages in orchestrator logs mentioning agent timeouts

**Investigation (3 min):**

```bash
# 1. Check which agents are down
ssh vps-dragon@100.120.151.91 'for p in 5001 5002 5003 5004; do
  curl -s http://localhost:$p/health > /dev/null && echo "Port $p: UP" || echo "Port $p: DOWN"
done'

# 2. Check Docker container status
ssh vps-dragon@100.120.151.91 'docker ps -a -f label=role=agent --format "table {{.Names}}\t{{.Status}}"'

# 3. Check Docker logs for errors
ssh vps-dragon@100.120.151.91 'docker logs --tail=50 opsly-agent-5001'

# 4. Check if containers OOM'd
ssh vps-dragon@100.120.151.91 'docker stats --no-stream'
```

**Recovery (2-5 min):**

```bash
# Option 1: Restart single unhealthy agent
ssh vps-dragon@100.120.151.91 'docker restart opsly-agent-5001'

# Option 2: Restart all agents
ssh vps-dragon@100.120.151.91 'docker compose -f /opt/opsly/infra/docker-compose.agents.yml restart'

# Option 3: Full platform restart (nuclear option)
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && docker compose -f infra/docker-compose.platform.yml restart'

# Verify recovery
sleep 10
ssh vps-dragon@100.120.151.91 'for p in 5001 5002 5003 5004; do
  curl -s http://localhost:$p/health | jq '.status' && echo "Port $p: HEALTHY" || echo "Port $p: STILL DOWN"
done'
```

**Post-recovery validation:**

```bash
# Check metrics normalized
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '.[-5:] | map(.escalation_reason)' | grep -i "agent"

# Should not show agent-related escalations
```

---

### Issue: Dashboard Shows No Data

**Symptoms:**

- Metrics dashboard shows empty charts
- `/api/validation/metrics` returns empty array
- No validation decisions recorded

**Investigation (3 min):**

```bash
# 1. Verify orchestrator is running
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/health

# 2. Check if metrics table has data
psql "$SUPABASE_POSTGRES_URL" << 'EOF'
SELECT COUNT(*) as total_metrics FROM validation_metrics;
SELECT COUNT(*) as recent_metrics FROM validation_metrics WHERE timestamp > NOW() - INTERVAL '1 hour';
EOF

# 3. Check Supabase connection
doppler run --project ops-intcloudsysops --config prd -- \
  echo "SUPABASE_URL: $SUPABASE_URL"

# 4. Check table exists and has correct schema
psql "$SUPABASE_POSTGRES_URL" << 'EOF'
\d validation_metrics
EOF
```

**Solutions:**

| Issue                             | Fix                                                                   |
| --------------------------------- | --------------------------------------------------------------------- |
| Supabase URL not set              | `export SUPABASE_URL=...` and restart orchestrator                    |
| validation_metrics table missing  | Run migration: `npm run db:migrate`                                   |
| Table has no recent data          | ValidationOrchestrator may not have processed jobs yet; wait 5-10 min |
| Table has old data but not recent | Check orchestrator logs: `docker logs orchestrator`                   |

**Force data insertion for testing:**

```bash
psql "$SUPABASE_POSTGRES_URL" << 'EOF'
INSERT INTO validation_metrics (job_id, agent_role, intent, next_action, validation_time_ms, escalation_reason, timestamp)
VALUES
  ('test-job-1', 'executor', 'api-generation', 'commit', 150, '', NOW()),
  ('test-job-2', 'planner', 'test-generation', 'iterate', 320, 'low_confidence', NOW());

SELECT COUNT(*) FROM validation_metrics WHERE timestamp > NOW() - INTERVAL '5 minutes';
EOF

# Verify dashboard now shows data
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '. | length'
```

---

### Watchdog Script Not Running

Check GitHub Actions workflow:

```bash
gh workflow view health-check-validation-orchestrator.yml --repo cloudsysops/opsly
```

Manually trigger health check:

```bash
gh workflow run health-check-validation-orchestrator.yml \
  --repo cloudsysops/opsly \
  -f skip_discord=true
```

### Can't Fetch Metrics

**Error**: "Failed to fetch metrics: 401 Unauthorized"

Solution: Ensure `PLATFORM_ADMIN_TOKEN` is set:

```bash
doppler run --project ops-intcloudsysops --config prd -- \
  echo $PLATFORM_ADMIN_TOKEN
```

**Error**: "Failed to fetch metrics: Connection refused"

Solution: Verify orchestrator is running:

```bash
curl http://localhost:3011/health
# Expected: {"status":"ok","service":"orchestrator","role":"...","mode":"..."}
```

### Discord Webhook Not Working

Test webhook URL:

```bash
curl -X POST "${DISCORD_WEBHOOK_HEALTH}" \
  -H 'Content-Type: application/json' \
  -d '{"content":"Test"}'

# Expected: HTTP 204 No Content
```

If failing:

1. Verify webhook URL is valid in GitHub Actions secrets
2. Check Discord channel permissions (bot can post)
3. Regenerate webhook URL in Discord server settings

### Metrics Show All Zeros

This may indicate no validation cycles have run yet.

Check if orchestrator has processed jobs:

```bash
curl http://localhost:3011/internal/job-status/<job_id>
```

Wait for some validations to complete, then check metrics again.

## Escalation Routes (SLOs and Contacts)

### When to Escalate to OpsAgent

**OpsAgent** (see `.claude/1-agent-teams/ops-agent.md`) handles infrastructure, deployments, and tenant lifecycle. Escalate when:

| Scenario                         | Action                                    | SLO    | Contact                         |
| -------------------------------- | ----------------------------------------- | ------ | ------------------------------- |
| **Orchestrator process crashed** | Restart container, verify recovery        | 5 min  | On-call Ops (Slack #ops-alerts) |
| **Agent pool >50% unhealthy**    | Check VPS resources, restart agents       | 10 min | On-call Ops                     |
| **Redis unavailable**            | Verify Redis running, check disk space    | 10 min | On-call Ops                     |
| **Database connection lost**     | Verify Supabase status, check credentials | 10 min | Database Team + Ops             |
| **Metrics not writing to DB**    | Check RLS policies, validate SUPABASE_URL | 15 min | Database Team                   |

**Escalation template:**

```
Subject: [CRITICAL] ValidationOrchestrator — <issue>
Channel: #ops-alerts
Mentions: @OpsAgent, @on-call-ops

Current Status:
- Escalation rate: X%
- Affected agents: [list]
- Duration: [time]

Impact:
- [number] jobs queued
- $[cost] additional cost per hour

Requested Action:
1. [immediate action needed]
2. [follow-up action]
```

---

### When to Create GitHub Issue vs Discord Alert

**GitHub Issue** (for bugs, improvements, investigations):

- Title: `[ops] ValidationOrchestrator — <description>`
- Labels: `operations`, `orchestrator`, `priority-<p1|p2|p3>`
- Assignee: Architecture team (for investigation) or OpsAgent (for remediation)

**Use GitHub Issue when:**

- Root cause is unknown or requires investigation >30 min
- Issue is recurring/systematic (not one-off)
- Fix requires code changes
- Needs documentation update

**Discord Alert** (#ops-alerts, #ops-general):

- Immediate notification for critical issues
- Quick status updates (every 15 min during incident)
- One-off alerts that resolve quickly (<30 min)
- Handoff to on-call team

**Use Discord Alert when:**

- Issue is transient (network hiccup, temporary queue spike)
- Mitigation is immediate (restart, cache clear)
- Needs on-call team response in <15 min

**Example escalation triggers:**

```
DISCORD → P1 issues (critical thresholds, incidents)
GITHUB → P2 issues (investigations, recurring problems)
SLACK → Status updates (for ongoing incidents)
```

---

### On-Call Rotation and Contact Matrix

**Engineering On-Call (24/7):**

- Schedule: `/on-call/engineering-schedule.md`
- Escalation: Tag `@on-call-eng` in Slack #ops-alerts
- Fallback: Ping directly in thread

**Ops/Reliability On-Call (business hours + on-call):**

- Schedule: `/on-call/ops-schedule.md`
- Escalation: Tag `@on-call-ops` in Slack #ops-alerts
- Fallback: `@reliability-lead`

**Database Team (Supabase/migrations):**

- Slack: #database
- Escalation: `@db-lead`
- Response time: 1 hour (SLA)

**Architecture Review (for design decisions):**

- Slack: #architecture
- Escalation: `@architecture-lead` or tag specific ADR owner
- Response time: 2-4 hours

**Contact info:** see `.claude/CLAUDE.md` contacts section

---

## Dashboard Integration

### Grafana Alerts

Alert rules are defined in: `infra/grafana/alerts/validation-orchestrator.json`

To load into Grafana:

```bash
# Export from Grafana UI or use Grafana API:
curl -X POST http://localhost:3000/api/ruler/grafana/rules \
  -H 'Authorization: Bearer $GRAFANA_API_KEY' \
  -H 'Content-Type: application/json' \
  -d @infra/grafana/alerts/validation-orchestrator.json
```

### Dashboard Access and Panels

**Local development dashboard:**

```bash
# Start orchestrator with metrics enabled
npm run dev --workspace=@intcloudsysops/orchestrator

# Open browser
open http://localhost:3011/dashboard/validation
```

**VPS production dashboard:**

- URL: http://vps-dragon:3011/dashboard/validation (via Tailscale)
- Requires: `PLATFORM_ADMIN_TOKEN` in Authorization header
- Real-time metrics updated every 10 seconds

**Grafana integration:**

```bash
# Grafana dashboard for ValidationOrchestrator
http://vps-dragon:3000/d/validation-orchestrator
  (requires Grafana auth)

# Alert rules
http://vps-dragon:3000/alerting/list
  Search: "ValidationOrchestrator"
```

### Key Metrics to Track

| Panel                   | Metric                    | What It Means                          | Alert Threshold             |
| ----------------------- | ------------------------- | -------------------------------------- | --------------------------- |
| **Escalation Rate**     | % of decisions → escalate | Agent capability vs request difficulty | >10% warning, >20% critical |
| **Avg Validation Time** | median + p95 (ms)         | Performance of validation pipeline     | p95 >500ms warning          |
| **Success Rate**        | % of decisions → commit   | Validation accuracy                    | <95% warning                |
| **Queue Depth**         | # jobs waiting in BullMQ  | System backpressure                    | >50 warning                 |
| **Agent Pool Status**   | each agent (5001-5004)    | Agent availability                     | 1+ down = warning           |
| **Prompt Improvement**  | % avg improvement/cycle   | Feedback loop effectiveness            | <2% warning                 |
| **Rollback Rate**       | % of cycles with rollback | Failed improvement attempts            | >1% per 100 cycles          |
| **LLM Cost/hour**       | $ spent on validations    | Cost management                        | set per budget              |

### Setting Up Alerts in Grafana

**Create alert for high escalation rate:**

```bash
# Via Grafana UI:
1. Dashboards → ValidationOrchestrator
2. Click escalation_rate panel
3. Edit → Alerts tab
4. Create alert:
   - Condition: escalation_rate_pct > 10
   - Duration: 5m (sustained high rate)
   - Contact: #ops-alerts Webhook

# Or via API:
curl -X POST http://vps-dragon:3000/api/ruler/grafana/rules/Alerts \
  -H 'Authorization: Bearer $GRAFANA_API_KEY' \
  -H 'Content-Type: application/json' \
  -d @infra/grafana/alerts/validation-orchestrator.json
```

### Runbook Links

All Grafana alerts include runbook links to this document:

- Incident: https://github.com/cloudsysops/opsly/blob/main/docs/04-operations/VALIDATION-ORCHESTRATOR-OPERATIONAL-GUIDE.md#incident-response
- Troubleshooting: https://github.com/cloudsysops/opsly/blob/main/docs/04-operations/VALIDATION-ORCHESTRATOR-OPERATIONAL-GUIDE.md#troubleshooting
- Escalation: https://github.com/cloudsysops/opsly/blob/main/docs/04-operations/VALIDATION-ORCHESTRATOR-OPERATIONAL-GUIDE.md#escalation-routes

## Performance Tuning

### Baseline Metrics (Healthy State)

Expected ranges for production ValidationOrchestrator:

| Metric                  | Target    | Acceptable  | Warning     |
| ----------------------- | --------- | ----------- | ----------- |
| Escalation rate         | 0-3%      | 0-5%        | 5-10%       |
| Avg validation time     | 100-200ms | <300ms      | 300-500ms   |
| p95 validation time     | 150-250ms | <500ms      | 500-1000ms  |
| Validation success rate | >98%      | >95%        | <95%        |
| Agent pool health       | 4/4       | 3/4         | 2 or fewer  |
| Rollback rate           | <0.5%     | <1% per 100 | >1% per 100 |
| Prompt improvement      | 4-6% avg  | >2%         | <2%         |
| Queue depth (normal)    | <5 jobs   | <20 jobs    | >50 jobs    |

### Model Tier Selection Logic

ValidationOrchestrator supports three agent model tiers. **Choose based on:**

| Tier           | Model                         | Cost/req | Latency   | Accuracy | Use When                             |
| -------------- | ----------------------------- | -------- | --------- | -------- | ------------------------------------ |
| **Economy**    | Haiku / GPT-4o mini           | $0.001   | 50-100ms  | 85-90%   | Dev, low-risk tasks, bulk validation |
| **Business**   | Claude 3.5 / GPT-4            | $0.01    | 150-300ms | 93-96%   | Production, standard agents          |
| **Enterprise** | Claude 3.5 Opus / GPT-4 Turbo | $0.05    | 300-800ms | 98%+     | Complex decisions, high-stakes       |

**Decision algorithm:**

```
IF agent_escalation_rate > 10% THEN upgrade_to_next_tier()
IF validation_time_p95 > 500ms AND success_rate > 95% THEN downgrade_to_economy()
IF success_rate < 90% THEN review_prompts_and_rules()
```

**Update agent model tier:**

```bash
# Via environment (Doppler)
doppler run --project ops-intcloudsysops --config prd -- \
  curl -X PATCH \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/admin/agent-config/executor \
  -d '{"model_tier": "enterprise"}'

# Verify change took effect
doppler run --project ops-intcloudsysops --config prd -- \
  curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/admin/agent-config | jq '.executor.model_tier'
```

### Feedback Loop Confidence Thresholds

The validation feedback loop uses confidence scores to decide when to escalate:

| Confidence | Action                       | Notes                                     |
| ---------- | ---------------------------- | ----------------------------------------- |
| 0.90-1.0   | **Commit** (100% confidence) | Safe to commit, no escalation needed      |
| 0.70-0.89  | **Commit** (high confidence) | Low risk of rollback                      |
| 0.50-0.69  | **Iterate** (moderate)       | Suggest prompt refinement, don't escalate |
| 0.30-0.49  | **Escalate** (low)           | Escalate to higher-tier agent             |
| <0.30      | **Escalate + Alert**         | Critical; human review may be needed      |

**Tuning confidence thresholds:**

```bash
# Increase commitment (fewer iterations)
curl -X PATCH \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/admin/validation-config \
  -d '{
    "confidence_threshold_commit": 0.60,
    "confidence_threshold_escalate": 0.25
  }'

# Result: fewer escalations, but slightly higher rollback risk
```

### Metrics Retention and Cleanup Policy

ValidationOrchestrator keeps metrics in two places:

1. **In-memory (MetricsStore):** last 100 cycles per prompt
2. **Supabase (validation_metrics table):** unlimited (archival)

**Retention policy:**

- Keep all metrics in Supabase (immutable audit trail)
- Archive to Parquet files quarterly for analytics
- Purge in-memory cache on orchestrator restart
- Keep last 7 days of metrics in hot dashboard cache

**Manual cleanup (if needed):**

```bash
# Archive old metrics to S3 (if configured)
curl -X POST \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/admin/archive-metrics \
  -d '{"before_date": "2026-04-01"}'

# Delete old metrics from validation_metrics (⚠️ destructive)
psql "$SUPABASE_POSTGRES_URL" << 'EOF'
DELETE FROM validation_metrics
WHERE timestamp < NOW() - INTERVAL '90 days'
AND (next_action = 'commit' OR rollback_triggered = false);  -- Keep failures for analysis

SELECT COUNT(*) as rows_deleted;
EOF
```

### Optimization Strategies

**1. Reduce Escalation Rate:**

- Identify top 3 most-escalated intents using metrics analysis
- Review and improve system prompts (in `apps/orchestrator/src/prompts/`)
- Increase model tier for problem agents (economy → business)
- Add example validations to context to improve performance

**2. Speed Up Validation:**

- Switch from enterprise → business → economy tier (cost vs latency trade-off)
- Reduce validation timeout (e.g., 1000ms → 500ms); fail fast on slow jobs
- Parallelize type-check and test validation (currently sequential)
- Implement result caching for identical code patterns
- Reduce prompt size/context sent to LLM

**3. Improve Success Rate:**

- Review top 10 failure patterns from metrics
- Update validation rules to catch issues earlier
- Improve system prompts with more examples
- Add additional context (codebase style guide, naming conventions)
- Increase model tier temporarily to diagnose root cause

**Example: Reducing escalation rate from 8% to <3%**

```bash
# Week 1: Identify problems
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '[.[] | select(.next_action == "escalate")] | length'

# Week 2: Upgrade highest-escalation agent to business tier
curl -X PATCH \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/admin/agent-config/executor \
  -d '{"model_tier": "business"}'

# Week 3: Review prompts, update system message
# (modify `apps/orchestrator/src/prompts/validation-system.md`)
git commit -m "improve(orchestrator): refine validation prompts for executor agent"

# Week 4: Verify improvement
curl -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN" \
  http://localhost:3011/api/validation/metrics | jq '
  [.[] | select(.timestamp > (now | todate) - "7 days")] |
  map(select(.next_action == "escalate")) |
  length / (. | length) * 100'
```

## Maintenance

### Daily Tasks

- Monitor health check results (check #ops-alerts channel)
- Review any warning-level alerts
- Check escalation rate trend

### Weekly Tasks

- Review metrics summary from `metricsStore.getSummary()`
- Analyze agent performance patterns
- Check for error trends

### Monthly Tasks

- Performance review meeting
- Capacity planning based on growth
- Update documentation if procedures change
- Archive old metrics data

## References

- **Source Code**: `apps/orchestrator/src/lib/validation-metrics.ts`
- **Health Server**: `apps/orchestrator/src/health-server.ts`
- **Metrics Store**: `apps/orchestrator/src/meta/orchestrator-metrics-store.ts`
- **Watchdog Script**: `scripts/watchdog-validation-orchestrator.ts`
- **GitHub Workflow**: `.github/workflows/health-check-validation-orchestrator.yml`
- **Grafana Alerts**: `infra/grafana/alerts/validation-orchestrator.json`

## Contact

For operational support:

- Critical incidents: Tag `@OpsAgent` in #ops-alerts
- Questions: Post in #ops-general
- Documentation updates: Submit PR to `docs/04-operations/`
