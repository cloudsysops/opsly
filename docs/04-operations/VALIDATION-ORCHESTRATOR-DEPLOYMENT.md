---
status: draft
owner: operations
last_review: 2026-05-24
type: doc
tags:
  - opsly/doc
---

# ValidationOrchestrator Deployment & Operations Guide

## Overview

The ValidationOrchestrator system provides automated validation → decision → commit coordination for agent-generated code. This guide covers deploying to VPS and monitoring 24/7 operation.

**Key Components:**
- **ValidationOrchestrator**: Lightweight coordinator for validation → decision → commit flow
- **TestValidatorWorker**: Executes npm run type-check, test, build pipeline
- **IterationManager**: Analyzes validation failures and suggests next prompts
- **LocalGitAutoCommit**: Auto-commits validated responses with metadata

**Architecture:**
```
UnifiedLocalAgentWorker
    ├─ Cursor service (localhost:5001)
    ├─ Claude service + Ollama (localhost:5002)
    └─ Copilot/OpenCode services (localhost:5003-5004)
        ↓
ValidationOrchestrator.validateAndDecide()
    ├─ Calls TestValidatorWorker.validate()
    ├─ Feeds results to IterationManager
    └─ Returns decision: commit | iterate | escalate
        ↓
if commit → writes .validation.json guard → LocalGitAutoCommit commits
if iterate → enqueues next prompt via PromptSuggester
if escalate → marks in Supabase + HelpRequestSystem
```

---

## Prerequisites

### Local Development
- Node 20+
- Docker & Docker Compose
- Git
- SSH access to VPS (via Tailscale)

### VPS Requirements
- Ubuntu 22.04 LTS
- Docker & Docker Compose
- Redis
- PostgreSQL
- 4GB+ RAM, 20GB disk

### SSH Access
```bash
# Verify Tailscale connection
tailscale status

# Test SSH to VPS
ssh vps-dragon@100.120.151.91 'echo OK'
```

---

## Phase 1: Local Testing (Before Deployment)

### 1. Run E2E Tests Locally

```bash
# Run full test suite
npm run test -- validation-orchestrator-e2e.test.ts

# Run specific test
npm run test -- validation-orchestrator-e2e.test.ts -t "3-iteration flow"

# Watch mode (for development)
npm run test -- validation-orchestrator-e2e.test.ts --watch
```

**Expected Output:**
```
ValidationOrchestrator E2E - 3-Iteration Flow
  ✓ should handle 3-iteration flow: fail → iterate → fail → iterate → pass → commit (XXXms)
  ✓ should escalate when max iterations exceeded (XXXms)
  ✓ should write validation guard to prevent double-commits (XXXms)
  ✓ should track iteration metadata correctly (XXXms)

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

### 2. Manual E2E Test with Real Services

**Terminal 1: Start Orchestrator**
```bash
npm run dev --workspace=@intcloudsysops/orchestrator
```

**Terminal 2: Start Cursor Agent Service** (simulated)
```bash
npx tsx scripts/mock-cursor-agent.ts
```

**Terminal 3: Create Test Prompt**
```bash
cat > .cursor/prompts/validation-test.md << 'EOF'
---
agent_role: cursor
max_iterations: 3
goal: Create a simple handler function
---

Create a handler function in TypeScript that:
1. Accepts a name parameter (string)
2. Returns a greeting string
3. Export as default

File: src/handlers/greeting.ts
EOF
```

**Terminal 4: Monitor Responses**
```bash
watch -n 0.5 'ls -la .cursor/responses/ .cursor/.validation/ | tail -10'
```

**Terminal 5: Monitor Git Commits**
```bash
watch -n 1 'git log --oneline | head -10'
```

**Verify:**
- ✅ `src/handlers/greeting.ts` created with proper code
- ✅ 3 iteration attempts (responses created)
- ✅ Final git commit with "iteration 3/3 complete" message
- ✅ `.cursor/.validation/{jobId}.json` metadata file

---

## Phase 2: VPS Deployment

### Prerequisites Check

```bash
# 1. Verify branch pushed
git push origin claude/opsly-defense-platform-sC0qH

# 2. Verify VPS connectivity
ssh vps-dragon@100.120.151.91 'docker ps --format "table {{.Names}}\t{{.Status}}"'

# 3. Verify working directory is clean
git status  # Should be clean
```

### Deploy to VPS

```bash
# Basic deployment (skips tests for speed)
bash scripts/deploy-validation-orchestrator.sh

# Full deployment (with type-check)
bash scripts/deploy-validation-orchestrator.sh --no-skip-tests

# Rollback to previous version
bash scripts/deploy-validation-orchestrator.sh --rollback
```

**What the Script Does:**

1. **Verification**: Checks SSH access, git status, branch exists
2. **Code Pull**: Fetches latest code from `claude/opsly-defense-platform-sC0qH`
3. **Type-Check**: Runs `npm run type-check` (if not skipped)
4. **Build**: Creates Docker image: `docker-compose build orchestrator`
5. **Shutdown**: Gracefully stops old container
6. **Startup**: Starts new container and waits for health
7. **Verification**: Confirms orchestrator is responding
8. **Tagging**: Tags release with timestamp

**Sample Output:**
```
ValidationOrchestrator Deployment Script
Branch: claude/opsly-defense-platform-sC0qH
Skip tests: yes

✅ SSH access verified
✅ Local git status clean
✅ Branch claude/opsly-defense-platform-sC0qH exists on origin

ℹ️  Starting deployment to VPS...
ℹ️  Step 1/6: Connecting to VPS and fetching latest code...
✅ Code fetched and checked out
✅ Docker image built
✅ Old container stopped
✅ New container started and healthy
✅ Deployment verified

===================================================
ValidationOrchestrator Deployment Summary
===================================================
VPS: vps-dragon@100.120.151.91
Branch: claude/opsly-defense-platform-sC0qH
Directory: /opt/opsly

✅ Deployment successful!

Next steps:
  1. Monitor logs: ssh vps-dragon@100.120.151.91 'docker logs -f orchestrator'
  2. Check health: curl http://100.120.151.91:3011/health
  3. View commits: ssh vps-dragon@100.120.151.91 'cd /opt/opsly && git log --oneline -5'
===================================================
```

---

## Phase 3: VPS Monitoring

### Start Continuous Monitoring

```bash
# Continuous monitoring (every 30 seconds)
bash scripts/monitor-validation-orchestrator.sh

# Single check
bash scripts/monitor-validation-orchestrator.sh --once

# Output as JSON
bash scripts/monitor-validation-orchestrator.sh --json
```

### Monitoring Checks

The script automatically checks every 30 seconds:

1. **Orchestrator Health**: HTTP GET to `/health` endpoint
2. **Container Status**: `docker ps` for running containers
3. **Error Rate**: Logs for "error", "exception", "failed"
4. **Escalation Rate**: Count escalations in `.validation/` directory
5. **Commit Rate**: Count git commits in last 30 minutes
6. **Queue Depth**: Redis queue statistics

### Alert Conditions

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Orchestrator Down | N/A | Critical alert |
| Container Not Running | N/A | Critical alert |
| Error Rate | >5 errors/hour | Warning alert |
| Escalation Rate | >10% | Warning alert |
| No Commits | >30 min | Warning |
| High Queue Depth | >1000 jobs | Info |

### Sample Output

```
═══════════════════════════════════════════════════════════════
[19:45:30] ℹ️  Health Check #42 at Sun May 4 19:45:30 UTC 2026
═══════════════════════════════════════════════════════════════
[19:45:30] ✅ Orchestrator status: healthy
[19:45:30] ✅ opsly-orchestrator: Up 2 hours
[19:45:30] ✅ opsly-redis: Up 2 hours
[19:45:30] ✅ opsly-postgres: Up 2 hours
[19:45:30] 📊 Errors in last hour: 0
[19:45:30] 📊 Escalation rate: 0.05 (1/20)
[19:45:30] 📊 Commits in last 30 min: 3
[19:45:30] ℹ️  Next check in 30s...
```

### Alert Log

Alerts are recorded in `/tmp/validation-orchestrator-alerts.log`:

```bash
# View recent alerts
tail -20 /tmp/validation-orchestrator-alerts.log

# Count alerts by severity
grep "severity" /tmp/validation-orchestrator-alerts.log | sort | uniq -c
```

---

## Operational Procedures

### Health Check (Manual)

```bash
# Quick health check
ssh vps-dragon@100.120.151.91 << 'EOF'
    echo "1. Docker containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    
    echo ""
    echo "2. Orchestrator health:"
    curl -s http://localhost:3011/health | jq .
    
    echo ""
    echo "3. Recent errors:"
    docker logs orchestrator --since=1h | grep -i error | tail -5
    
    echo ""
    echo "4. Recent commits:"
    cd /opt/opsly && git log --oneline -5
EOF
```

### View Logs

```bash
# Real-time orchestrator logs
ssh vps-dragon@100.120.151.91 'docker logs -f orchestrator'

# Last N lines
ssh vps-dragon@100.120.151.91 'docker logs orchestrator --tail 100'

# Logs since specific time
ssh vps-dragon@100.120.151.91 'docker logs orchestrator --since=1h'

# Find specific job logs
ssh vps-dragon@100.120.151.91 'docker logs orchestrator | grep "job-abc123"'
```

### View Validation Records

```bash
# List all validation decisions
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && find .cursor/.validation -name "*.json" | sort'

# View specific job validation
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && cat .cursor/.validation/job-abc123.json | jq .'

# Count by action
ssh vps-dragon@100.120.151.91 << 'EOF'
    cd /opt/opsly
    echo "Commit decisions: $(find .cursor/.validation -name '*.json' | xargs grep -l '\"action\": \"commit\"' | wc -l)"
    echo "Iterate decisions: $(find .cursor/.validation -name '*.json' | xargs grep -l '\"action\": \"iterate\"' | wc -l)"
    echo "Escalate decisions: $(find .cursor/.validation -name '*.json' | xargs grep -l '\"action\": \"escalate\"' | wc -l)"
EOF
```

### View Generated Code

```bash
# List all generated responses
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && ls -la .cursor/responses/'

# View specific response
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && cat .cursor/responses/response-job-abc123.md'

# Count responses
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && ls -1 .cursor/responses/ | wc -l'
```

### Restart Services

```bash
# Graceful restart (keeps data)
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && docker-compose restart orchestrator'

# Full restart (clears queues)
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && docker-compose restart'

# Rebuild and restart
bash scripts/deploy-validation-orchestrator.sh
```

### Troubleshooting

#### Orchestrator Not Responding

```bash
# Check container status
ssh vps-dragon@100.120.151.91 'docker ps | grep orchestrator'

# Check logs for errors
ssh vps-dragon@100.120.151.91 'docker logs orchestrator --tail 50'

# Restart
ssh vps-dragon@100.120.151.91 'docker-compose restart orchestrator'

# Wait and verify
sleep 5
curl http://100.120.151.91:3011/health
```

#### High Error Rate

```bash
# Find errors
ssh vps-dragon@100.120.151.91 'docker logs orchestrator --since=1h | grep -i "error\|exception" | head -20'

# Check recent commits
ssh vps-dragon@100.120.151.91 'cd /opt/opsly && git log --oneline -10'

# Rollback if needed
bash scripts/deploy-validation-orchestrator.sh --rollback
```

#### Queue Stuck

```bash
# Check Redis queue depth
ssh vps-dragon@100.120.151.91 'docker exec opsly-redis redis-cli DBSIZE'

# Clear specific queue (use with caution)
ssh vps-dragon@100.120.151.91 << 'EOF'
    docker exec opsly-redis redis-cli
    # In redis-cli:
    # KEYS "bull:local-agents:*" (view keys)
    # DEL key1 key2 ... (delete specific jobs)
    # FLUSHDB (clear all - DANGEROUS)
EOF
```

---

## Metrics & SLOs

### Key Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Uptime | 99.9% | <99.5% | <95% |
| Health Check Response | <100ms | >500ms | >2s |
| Commit Rate | 3+ per 30 min | <1 per 30 min | 0 per 30 min |
| Error Rate | <1 per hour | >5 per hour | >10 per hour |
| Escalation Rate | <5% | >10% | >20% |
| Queue Depth | <100 | >500 | >1000 |

### Monthly Report Template

```markdown
# ValidationOrchestrator - Monthly Report [Month]

## Uptime
- Total uptime: XX.X%
- Incidents: X
- MTTR: XXX minutes

## Activity
- Total jobs processed: XXX
- Successful commits: XXX (XX%)
- Iterations: XXX (XX%)
- Escalations: XXX (XX%)

## Errors
- Total errors: XX
- Most common: [error type]
- Resolution time: XX minutes average

## Performance
- Average validation time: XX ms
- P95 validation time: XX ms
- Commit frequency: XX per hour

## Recommendations
- [List any needed improvements]
```

---

## Scaling

### Multi-VPS Setup (Future)

```yaml
# Multiple orchestrator instances
orchestrator-vps1: 100.120.151.91 (primary)
orchestrator-vps2: 100.120.151.92 (secondary)
orchestrator-vps3: 100.120.151.93 (tertiary)

# Shared Redis (for job coordination)
redis: redis-vps.internal (shared)

# Shared PostgreSQL (for validation records)
postgres: postgres-vps.internal (shared)
```

### Agent Service Scaling

```bash
# Current local-only
cursor: localhost:5001
claude: localhost:5002

# Future distributed
cursor-1: 192.168.1.100:5001
cursor-2: 192.168.1.101:5001
claude-1: 192.168.1.200:5002
```

Just update `config/agent-services.yaml` - no code changes needed.

---

## Integration with Other Systems

### Discord Notifications

```bash
# Send deployment notification
curl -X POST "$DISCORD_WEBHOOK_URL" -H "Content-Type: application/json" -d '{
  "content": "✅ ValidationOrchestrator deployed to VPS",
  "embeds": [{
    "title": "Deployment Status",
    "fields": [
      {"name": "Branch", "value": "claude/opsly-defense-platform-sC0qH"},
      {"name": "Commit", "value": "abc123"},
      {"name": "Status", "value": "Healthy"}
    ]
  }]
}'
```

### GitHub PR Comments

```bash
# Comment on PR with deployment status
gh pr comment 199 --body "✅ ValidationOrchestrator deployed to VPS at $(date)"
```

### Supabase Webhooks

```bash
# Record deployment in audit log
curl -X POST "https://jkwykpldnitavhmtuzmo.supabase.co/rest/v1/audit_logs" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "deployment",
    "service": "validation-orchestrator",
    "status": "success",
    "metadata": {
      "branch": "claude/opsly-defense-platform-sC0qH",
      "vps": "100.120.151.91"
    }
  }'
```

---

## Rollback Procedures

### Quick Rollback

```bash
# Rollback to previous deployment
bash scripts/deploy-validation-orchestrator.sh --rollback

# Verify
curl http://100.120.151.91:3011/health
git log -1 --format=%H  # Should show previous commit
```

### Manual Rollback

```bash
ssh vps-dragon@100.120.151.91 << 'EOF'
    cd /opt/opsly
    
    # Stop current
    docker-compose down
    
    # Get previous commit
    git log --oneline -2
    git reset --hard HEAD~1
    
    # Rebuild and start
    docker-compose up -d orchestrator
    
    # Verify
    curl http://localhost:3011/health
EOF
```

---

## Links & References

- **Deployment Script**: `scripts/deploy-validation-orchestrator.sh`
- **Monitoring Script**: `scripts/monitor-validation-orchestrator.sh`
- **E2E Tests**: `apps/orchestrator/src/__tests__/validation-orchestrator-e2e.test.ts`
- **Implementation**: `apps/orchestrator/src/lib/validation-orchestrator.ts`
- **VPS Access**: Tailscale → `vps-dragon@100.120.151.91`
- **Repository**: `cloudsysops/opsly` branch `claude/opsly-defense-platform-sC0qH`

---

## Support

For issues or questions:
1. Check monitoring output: `bash scripts/monitor-validation-orchestrator.sh --once`
2. Review logs: `ssh vps-dragon@100.120.151.91 'docker logs orchestrator | tail -50'`
3. Check validation records: `.cursor/.validation/` directory
4. Escalate to: [@architecture team]

**Last Updated**: 2026-05-04
**Version**: 1.0.0

---

## Enlaces relacionados

- [[04-operations/README|04-operations]]
- [[brain/README|Brain Central]]
