---
name: opsly-peskids-deployment
description: Autonomous deployment of Peskids N8N + Uptime Kuma
version: 1.0.0
status: active
owner: operations
---

# Peskids Deployment Skill

Autonomous agent skill for deploying Peskids Phase 2 components (N8N workflows and Uptime Kuma monitoring).

## Overview

This skill enables agents to autonomously:
- Validate VPS connectivity and services
- Deploy N8N container with lead workflows
- Deploy Uptime Kuma with monitoring
- Run smoke tests and verify deployment

## Trigger Conditions

Agents should invoke this skill when:
- ✅ Peskids Phase 1 is live and verified
- ✅ Client is ready for Phase 2 automation
- ✅ SSH access to VPS is available (100.120.151.91)
- ✅ All prerequisites are met (Tailscale, credentials)

## Agent API

### BullMQ Job Structure

```typescript
interface PeskidsDeploymentJob {
  task: 'validate-vps' | 'deploy-n8n' | 'deploy-uptime' | 'full-deployment';
  environment: 'prd' | 'staging';
  vpsHost?: string;      // default: 100.120.151.91
  vpsUser?: string;      // default: root
  idempotency_key?: string;
  request_id?: string;
}
```

### Queue Job

```typescript
// From orchestrator/planner/agent
const queue = new Queue('peskids-deployment');

// Option A: Validate only
await queue.add('peskids:validate-vps', {
  task: 'validate-vps',
  environment: 'prd',
  request_id: 'abc-123',
});

// Option B: Deploy N8N
await queue.add('peskids:deploy-n8n', {
  task: 'deploy-n8n',
  environment: 'prd',
  request_id: 'abc-123',
});

// Option C: Deploy Uptime
await queue.add('peskids:deploy-uptime', {
  task: 'deploy-uptime',
  environment: 'prd',
  request_id: 'abc-123',
});

// Option D: Full deployment (recommended)
await queue.add('peskids:full-deployment', {
  task: 'full-deployment',
  environment: 'prd',
  request_id: 'abc-123',
});
```

## Agent Decision Logic

### When to Invoke

```
IF (peskids_phase1_live AND ssh_access_available AND client_approved) THEN
  enqueue peskids-deployment job WITH task='full-deployment'
ELSE IF (validation_needed) THEN
  enqueue peskids-deployment job WITH task='validate-vps'
ENDIF
```

### Expected Outcomes

**Success (full-deployment):**
```
{
  status: 'complete',
  vpsValid: true,
  n8nDeployed: true,
  uptimeDeployed: true,
  smokeTestsPassed: true
}
```

**Partial Success:**
- VPS validation fails → Stop, escalate
- N8N deploy fails → Retry or manual intervention
- Uptime deploy fails → Can proceed if N8N works
- Smoke tests fail → Review logs, manual fix

## Observability

All jobs log to structured logging with:
- `request_id` — Tracing across systems
- `job_id` — BullMQ job identifier
- `task` — Which component being deployed
- Step-by-step progress (job.progress())

### Log Patterns

```json
{
  "timestamp": "2026-06-22T22:00:00Z",
  "level": "info",
  "message": "Starting Peskids full-deployment",
  "context": {
    "environment": "prd",
    "task": "full-deployment",
    "request_id": "abc-123",
    "job_id": "bullmq-job-456"
  }
}
```

## Prerequisites

### VPS Access
- SSH key configured
- Tailscale VPN active
- credentials: root@100.120.151.91

### Code State
- All Peskids code merged to main
- N8N bootstrap script present
- Uptime scripts ready

### Client Approval
- Phase 2 go-ahead received
- Client contact info available
- Notification channels (Slack, email) configured

## Fallback / Error Handling

| Error | Agent Action |
|-------|--------------|
| SSH fails | Log error, escalate to ops, wait for manual fix |
| Docker not running | Attempt restart, retry, escalate if fails |
| N8N deploy fails | Rollback, notify, suggest manual deploy |
| Smoke tests fail | Review logs, escalate to eng team |

## Timeline

- **Validate only:** 2-3 minutes
- **Deploy N8N:** ~1 hour (includes manual workflow setup)
- **Deploy Uptime:** ~30 minutes
- **Full deployment:** ~1.5 hours (validate → N8N → Uptime → smoke)

## Success Criteria

Deployment is successful when:
- ✅ VPS validation passes all checks
- ✅ N8N container running + health check OK
- ✅ Uptime Kuma container running + monitors configured
- ✅ All smoke tests pass (API, landing, N8N, Uptime endpoints)
- ✅ Client can access dashboard and workflows are active

## Client Notification

On success, agent should:
1. Post to Slack: "Peskids Phase 2 deployment complete"
2. Email client: "Your Peskids automation is ready"
3. Provide access: N8N UI + Uptime dashboard URLs
4. Schedule follow-up: Training call for workflow management

## Next Steps (After This Skill)

Post-deployment, agents should trigger:
- **opsly-client-onboarding** — Training + docs
- **opsly-monitoring** — Set up alerts + dashboards
- **opsly-billing** — Activate subscription, send invoice

## Skill Files

| File | Purpose |
|------|---------|
| `SKILL.md` | This document |
| `worker.ts` | BullMQ worker implementation |
| `scripts/peskids-orchestrator.sh` | Manual fallback script (root level) |
| `docs/05-deployment-status/PESKIDS-GO-LIVE-STATUS.md` | Deployment status reference |

## Related Skills

- **opsly-context** — Gather Peskids context before deploy
- **opsly-orchestrator** — Queue + monitor jobs
- **opsly-infra** — VPS health, Docker management
- **opsly-client-onboarding** — Post-deploy client training

---

*Last updated: 2026-06-22 by Claude (claude-haiku-4-5-20251001)*
