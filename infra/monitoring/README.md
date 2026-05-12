# ValidationOrchestrator Health Monitoring

24/7 automated health monitoring and alerting system for ValidationOrchestrator.

## Components

### Watchdog Script
**File**: `scripts/watchdog-validation-orchestrator.ts`

Monitors ValidationOrchestrator health every 5 minutes by:
- Fetching metrics from `/internal/meta-optimizer/metrics`
- Checking escalation rate, validation time, agent pool status
- Sending Discord alerts on threshold breaches
- Logging results to stdout

Exit codes:
- `0` = healthy
- `1` = warning
- `2` = critical

### GitHub Actions Workflow
**File**: `.github/workflows/health-check-validation-orchestrator.yml`

Automated workflow that:
- Runs every 5 minutes (configurable)
- Executes watchdog script
- Creates issues on critical failures
- Archives metrics for dashboard integration

Secrets required:
- `DISCORD_WEBHOOK_HEALTH`: Discord webhook URL for alerts
- `ORCHESTRATOR_ENDPOINT`: Optional, defaults to `http://localhost:3011`

### Test Suite
**File**: `scripts/test-watchdog.ts`

Validates watchdog logic with mock metrics:
- Healthy state (escalation <5%)
- Warning state (escalation 10-20%)
- Critical state (escalation >20%)

Run locally:
```bash
npx tsx scripts/test-watchdog.ts
```

### Grafana Alerts
**File**: `infra/grafana/alerts/validation-orchestrator.json`

Prometheus-style alert rules for integration with Grafana:
- Escalation rate warnings/critical
- Validation time warnings/critical
- Agent pool health checks
- Notification routing to #ops-alerts

### Operational Guide
**File**: `docs/04-operations/VALIDATION-ORCHESTRATOR-OPERATIONAL-GUIDE.md`

Complete operational procedures:
- Health threshold definitions
- Incident response playbooks
- Troubleshooting guides
- Performance tuning strategies
- Maintenance schedules

## Alert Thresholds

| Condition | Warning | Critical |
|-----------|---------|----------|
| Escalation Rate | >10% | >20% |
| Avg Validation Time | >500ms | >1000ms |
| Agent Pool | Configured monitoring | 1+ agent unreachable |

## Quick Start

### Setup Discord Webhook

1. Create Discord channel (e.g., #ops-alerts)
2. Create webhook: Settings → Integrations → Webhooks
3. Copy webhook URL
4. Add to GitHub Actions secrets: `DISCORD_WEBHOOK_HEALTH`

### Enable GitHub Actions Workflow

Workflow is automatically enabled. To manually trigger:
```bash
gh workflow run health-check-validation-orchestrator.yml \
  --repo cloudsysops/opsly \
  --skip-discord=false
```

### Test Locally

```bash
# Run tests
npx tsx scripts/test-watchdog.ts

# Run watchdog (requires orchestrator at localhost:3011)
DISCORD_WEBHOOK_HEALTH="" npx tsx scripts/watchdog-validation-orchestrator.ts
```

## Metrics Captured

From `/internal/meta-optimizer/metrics`:

```json
{
  "success": true,
  "summary": {
    "prompt-name": {
      "cycles_evaluated": 100,
      "avg_improvement_pct": 5.5,
      "validation_success_rate": 98.5,
      "rollback_count": 1,
      "last_metric_timestamp": "2026-05-04T14:30:00Z"
    }
  }
}
```

Watchdog computes:
- **escalation_rate_pct**: (100 - validation_success_rate) / # intents
- **avg_validation_time_ms**: Placeholder (placeholder in v1)
- **agent_pool_status**: Health of ports 5001-5004

## Architecture

```
GitHub Actions (every 5 min)
    ↓
watchdog-validation-orchestrator.ts
    ↓
    ├→ Fetch /internal/meta-optimizer/metrics
    ├→ Check agent ports 5001-5004
    ├→ Evaluate thresholds
    ├→ Log results to stdout
    └→ POST to Discord webhook on alert
```

## Integration Points

### With Supabase
Health checks can be stored in `health_checks` table for historical tracking:

```sql
CREATE TABLE health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  status TEXT NOT NULL,
  escalation_rate_pct NUMERIC,
  avg_validation_time_ms NUMERIC,
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

### With Grafana
Import alert rules from `infra/grafana/alerts/validation-orchestrator.json` using Grafana API or UI.

### With Dashboard
Archive metrics artifacts for integration into monitoring dashboard via Actions artifacts API.

## Troubleshooting

### Workflow Not Triggering

Check Actions settings:
```bash
gh workflow view health-check-validation-orchestrator.yml \
  --repo cloudsysops/opsly
```

### Metrics Unavailable

Verify orchestrator health:
```bash
curl http://localhost:3011/health
```

### Discord Alerts Not Received

Test webhook:
```bash
curl -X POST "${DISCORD_WEBHOOK_HEALTH}" \
  -H 'Content-Type: application/json' \
  -d '{"content":"Test"}'
```

## Files

- `scripts/watchdog-validation-orchestrator.ts` - Main monitoring script
- `scripts/test-watchdog.ts` - Test suite with mock data
- `.github/workflows/health-check-validation-orchestrator.yml` - GitHub Actions workflow
- `infra/grafana/alerts/validation-orchestrator.json` - Alert rules
- `infra/monitoring/README.md` - This file
- `docs/04-operations/VALIDATION-ORCHESTRATOR-OPERATIONAL-GUIDE.md` - Operational guide

## Next Steps

1. Configure Discord webhook and add to GitHub Actions secrets
2. Deploy workflow (automatically enabled on push)
3. Monitor first health check results
4. Integrate Grafana alerts
5. Document any custom procedures for your team
