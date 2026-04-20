# ADR-024 Ollama Local Worker Deployment Runbook

## Overview

This document describes the deployment and operational procedures for ADR-024: using Ollama running on a local Mac (2011, IP: 100.80.41.29) as the primary LLM provider with cloud fallback.

**Architecture Decision Record:** [`docs/adr/ADR-024-ollama-local-primary-llm.md`](./adr/ADR-024-ollama-local-primary-llm.md)

## Infrastructure Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Opsly VPS (DigitalOcean, 100.64.0.x)                       │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐                                        │
│ │  LLM Gateway     │ Port 3010                              │
│ │  - Health Daemon │ Checks llama_local health every 30s   │
│ │  - Routing Logic │ Tries llama_local 1st, falls back     │
│ └─────────┬────────┘                                        │
│           │                                                 │
│           ├────────────┐                                    │
│           │            │                                    │
│ ┌─────────▼────────┐   │                                    │
│ │  Orchestrator    │   │ Port 3011                          │
│ │  BullMQ Worker   │   │ enqueue-ollama endpoint            │
│ │  OllamaWorker    │   │                                    │
│ └──────────────────┘   │                                    │
│           │            │                                    │
│ ┌─────────▼────────────▼────┐                              │
│ │  Redis (Cluster)          │ Port 6379                     │
│ │  Job queue + cache        │                              │
│ └───────────────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
        │ Tailscale VPN (100.x.x.x)
        │
┌───────▼──────────────────────────────────────────────────────┐
│ Local Mac 2011 (100.80.41.29) — Ollama Primary              │
├────────────────────────────────────────────────────────────── │
│ ┌──────────────────────────────────┐                         │
│ │ Ollama Service (localhost:11434) │                         │
│ ├──────────────────────────────────┤                         │
│ │ Models:                          │                         │
│ │ - llama3.2 (7B, ~4GB)           │                         │
│ │ - [secondary model]             │                         │
│ └──────────────────────────────────┘                         │
│ Health Check: GET /api/tags → 200 OK                         │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables (Doppler `prd` config)

```bash
# Ollama Endpoint (Mac 2011 on Tailscale)
OLLAMA_URL=http://100.80.41.29:11434
OLLAMA_MODEL=llama3.2

# Health Daemon Configuration (LLM Gateway)
OLLAMA_HEALTH_CHECK_INTERVAL_SEC=30      # Check every 30s
OLLAMA_HEALTH_CHECK_TIMEOUT_SEC=3        # 3s timeout
OLLAMA_CALL_TIMEOUT_SEC=1                # 1s timeout for actual calls
OLLAMA_CIRCUIT_BREAKER_THRESHOLD=3       # Mark down after 3 failures

# Hermes Mode Routing (Optional, enable for decision+S tasks)
HERMES_LOCAL_LLM_FIRST=true

# Gateway Routing Bias
GATEWAY_ROUTING_BIAS_COST=true            # Prefer cheap providers

# Fallback Chain (if Ollama down)
FALLBACK_PROVIDERS=claude_haiku,gpt4o_mini,openrouter_cheap
```

**Note:** To activate in Doppler:
```bash
doppler run --project ops-intcloudsysops --config prd -- \
  doppler secrets set HERMES_LOCAL_LLM_FIRST=true
```

## Health Daemon Operation

### Mechanism

The LLM Gateway's HealthDaemon runs every 30 seconds and:

1. **Checks Ollama availability:**
   ```
   GET http://100.80.41.29:11434/api/tags HTTP/1.1
   Timeout: 3s
   ```

2. **Tracks consecutive failures:**
   - Success → consecutive_failures = 0
   - Failure → consecutive_failures++
   - 3+ failures → mark provider as "down" in Redis

3. **Stores status in Redis:**
   ```
   key: llm_gateway:health:llama_local
   ttl: 300s
   value: { status: "up|degraded|down", consecutive_failures: N, timestamp: ISO }
   ```

### Manual Health Check

From VPS:
```bash
# Check Ollama directly
curl -v http://100.80.41.29:11434/api/tags

# Check health daemon status in Redis
redis-cli GET llm_gateway:health:llama_local

# Monitor health checks (real-time)
docker exec infra-redis-1 redis-cli \
  --stat --interval 1 \
  --rdb /tmp/health.rdb
```

## Request Flow

### 1. Client Request → Orchestrator

```bash
POST /internal/enqueue-ollama
Content-Type: application/json

{
  "tenant_slug": "jkbotero",
  "prompt": "Explain Opsly architecture",
  "plan": "startup|business|enterprise",
  "request_id": "req_abc123",
  "task_type": "decision",
  "metadata": { "effort": "S", "priority": 0 }
}
```

**Orchestrator response:** `202 Accepted`
```json
{
  "job_id": "job_xyz789",
  "request_id": "req_abc123",
  "status": "queued"
}
```

### 2. Orchestrator → Redis Queue

Orchestrator creates a BullMQ job:
- Type: `ollama`
- Data: `{ tenant_slug, prompt, plan, request_id, ... }`
- Priority: 0 (highest)
- Queue: `default`

### 3. OllamaWorker Processes Job

```
OllamaWorker.process(job):
  1. Fetch from LLM Gateway: POST /v1/text
     - Model: llama_local (fallback to claude_haiku if down)
     - Timeout: 120s
  2. Meter usage: logUsage({ tenant_slug, request_id, model: "llama_local", ... })
  3. Check for auto-commit (evolution-agent, notifier-desayuno, etc.)
  4. Return response
```

### 4. Response → Client

Job completed, response stored in Redis under job_id.

**Status check:**
```bash
GET /internal/openclaw-job?job_id=job_xyz789
```

## Testing & Validation

### E2E Test (From VPS)

```bash
#!/bin/bash
# Test script: test-ollama-e2e.sh

ADMIN_TOKEN="$PLATFORM_ADMIN_TOKEN"
TENANT="jkbotero"

# 1. Enqueue job
echo "📤 Enqueueing ollama job..."
JOB=$(curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_slug": "'$TENANT'",
    "prompt": "What is the capital of France?"
  }' \
  http://localhost:3002/api/admin/ollama-demo | jq -r .job_id)

echo "Job ID: $JOB"

# 2. Poll for completion
echo "⏳ Waiting for job..."
for i in {1..30}; do
  STATUS=$(curl -s \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "http://localhost:3002/api/admin/ollama-demo?job_id=$JOB" \
    | jq -r .status)
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ Job completed!"
    curl -s \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      "http://localhost:3002/api/admin/ollama-demo?job_id=$JOB" | jq .
    exit 0
  fi
  
  echo "Status: $STATUS (attempt $i/30)"
  sleep 2
done

echo "❌ Job timeout"
exit 1
```

### Unit Tests

```bash
# Run Gateway tests (health daemon, routing)
npm run test --workspace=@intcloudsysops/llm-gateway

# Run Orchestrator tests (OllamaWorker, enqueue)
npm run test --workspace=@intcloudsysops/orchestrator -- --grep "ollama"

# Run API tests (admin endpoint)
npm run test --workspace=@intcloudsysops/api -- --grep "ollama-demo"
```

## Troubleshooting

### Ollama not responding

**Symptom:** Job timeouts, health daemon marks provider as "down"

**Diagnosis:**
```bash
# Check Mac 2011 SSH connection
ssh -i ~/.ssh/tailscale jkbotero@100.80.41.29 "ps aux | grep ollama"

# Check Ollama logs
ssh -i ~/.ssh/tailscale jkbotero@100.80.41.29 "tail -50 ~/.ollama/logs/server.log"

# Check Mac's network
ssh -i ~/.ssh/tailscale jkbotero@100.80.41.29 \
  "netstat -an | grep 11434 | head -5"
```

**Solutions:**
1. Restart Ollama: `pkill -f ollama && sleep 2 && ollama serve`
2. Check VPN: Verify Tailscale connection is active on both sides
3. Check firewall: Ensure UFW on Mac allows port 11434 from VPS

### High latency (>5s per request)

**Diagnosis:**
```bash
# Check Mac CPU/Memory
ssh -i ~/.ssh/tailscale jkbotero@100.80.41.29 "top -l1"

# Check network latency
ping 100.80.41.29
```

**Solutions:**
1. Reduce model size (try `llama3.2` instruct variant)
2. Add more VRAM if available
3. Monitor queue depth: `redis-cli LLEN queue:ollama`

### VPS → Ollama connectivity lost

**Diagnosis:**
```bash
# From VPS
docker exec infra-app-1 curl -v http://100.80.41.29:11434/api/tags

# Check routing
docker exec infra-app-1 traceroute 100.80.41.29

# Check DNS
docker exec infra-app-1 nslookup ollama.tailscale.local
```

**Solutions:**
1. Verify Tailscale status on VPS: `tailscale status`
2. Verify Tailscale on Mac: `tailscale status`
3. Re-authenticate if needed: `tailscale login`

## Monitoring

### Metrics Dashboard

Available at: `https://admin.opsly.dev/metrics/ollama` (requires `PLATFORM_ADMIN_TOKEN`)

**Metrics displayed:**
- Total requests to Ollama
- Average latency
- Cache hit rate
- Per-tenant breakdown
- Success rate

### Prometheus Queries

```promql
# Ollama request rate
rate(llm_gateway_requests{provider="llama_local"}[5m])

# Ollama latency (p95)
histogram_quantile(0.95, llm_gateway_latency_ms{provider="llama_local"})

# Success rate
rate(llm_gateway_requests{provider="llama_local",status="success"}[5m])
  /
rate(llm_gateway_requests{provider="llama_local"}[5m])
```

### Log Tailing

```bash
# Docker logs (VPS)
docker logs -f opsly_llm_gateway | grep -i ollama

# Orchestrator logs
docker logs -f opsly_orchestrator | grep -i "oar\|ollama"

# Check Supabase usage_events
psql "$DATABASE_URL" -c "
  SELECT model, COUNT(*) as requests, AVG(EXTRACT(EPOCH FROM latency_ms)) as avg_latency_ms
  FROM usage_events
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND model = 'llama_local'
  GROUP BY model
"
```

## Rollback Procedure

If Ollama fails and needs to be disabled:

1. **Set fallback-only mode:**
   ```bash
   doppler run --project ops-intcloudsysops --config prd -- \
     doppler secrets set OLLAMA_CIRCUIT_BREAKER_THRESHOLD=1
   ```
   This makes health daemon mark provider down after 1 failure instead of 3.

2. **Or disable in gateway:**
   ```bash
   # Modify: apps/llm-gateway/src/llm-direct.ts
   # Comment out: if (await healthDaemon.isAvailable('llama_local'))
   # Force fallback chain
   ```

3. **Redeploy VPS:**
   ```bash
   ./scripts/deploy-vps.sh --config prd
   ```

## References

- ADR-024: `docs/adr/ADR-024-ollama-local-primary-llm.md`
- Health daemon: `apps/llm-gateway/src/health-daemon.ts`
- Routing logic: `apps/llm-gateway/src/llm-direct.ts`
- OllamaWorker: `apps/orchestrator/src/workers/OllamaWorker.ts`
- Admin endpoint: `apps/api/app/api/admin/ollama-demo/route.ts`
