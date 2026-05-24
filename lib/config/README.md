---
title: "@intcloudsysops/config"
description: "Environment and feature flag management"
---
# @intcloudsysops/config

Centralized configuration and feature flags for safe, environment-aware deployments.

## Features

- ✅ **Environment Config** — NODE_ENV, log level, database, Redis, etc.
- 🚀 **Feature Flags** — Per-tenant, per-environment flag control
- 🔄 **Runtime Updates** — Fetch flags dynamically without restart
- 📝 **Type-Safe** — Full TypeScript configuration
- 🔐 **Secret Aware** — Separate secrets from config

## Usage

### Load Environment Config

```typescript
import { getConfig } from '@intcloudsysops/config';

const config = getConfig();
console.log(config.NODE_ENV);        // 'development' | 'staging' | 'production'
console.log(config.LOG_LEVEL);       // 'debug' | 'info' | 'warn' | 'error'
console.log(config.AGENT_MAX_CONCURRENT); // 10
```

### Check Feature Flags

```typescript
import { getFeatureFlags } from '@intcloudsysops/config';

const flags = await getFeatureFlags('tenant-abc');

if (flags.agentsV2Enabled) {
  // Use new agent orchestration
} else {
  // Use legacy orchestration
}

if (flags.evaluationStrictMode) {
  // Enforce quality gates
} else {
  // Allow lower quality during development
}
```

### Configuration Structure

```typescript
interface Config {
  // Deployment
  NODE_ENV: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  PORT: number;

  // Database
  DATABASE_URL: string;
  DATABASE_POOL_SIZE: number;

  // Cache
  REDIS_URL: string;
  CACHE_TTL_SECONDS: number;

  // Agents
  AGENT_MAX_CONCURRENT: number;
  AGENT_EXECUTION_TIMEOUT_MS: number;

  // Evaluation
  EVALUATION_STRICT_MODE: boolean;
  EVALUATION_MIN_QUALITY_SCORE: number;

  // Observability
  LOG_STORAGE_RETENTION_DAYS: number;
}
```

### Feature Flags Structure

```typescript
interface FeatureFlags {
  agentsV2Enabled: boolean;         // New agent orchestration
  evaluationStrictMode: boolean;    // Enforce quality gates
  cacheEnabled: boolean;             // Use Redis caching
  profilerEnabled: boolean;          // Performance profiling
  debugLogsEnabled: boolean;         // Verbose logging
  a2bTestingEnabled: boolean;        // A/B testing framework
}
```

## Integration by Service

### API

```typescript
import { getConfig, getFeatureFlags } from '@intcloudsysops/config';

app.post('/api/agents/:id/execute', async (req, res) => {
  const { tenantId } = req.user;
  const flags = await getFeatureFlags(tenantId);

  if (flags.evaluationStrictMode) {
    // Run full evaluation before executing
    await runEvaluation(input);
  }

  const result = await agent.execute(input);
  res.json({ result });
});
```

### Orchestrator

```typescript
import { getConfig } from '@intcloudsysops/config';

const config = getConfig();

// Limit concurrent agents based on config
const concurrencyLimit = config.AGENT_MAX_CONCURRENT;
const timeout = config.AGENT_EXECUTION_TIMEOUT_MS;

for (const job of queue.jobs) {
  if (activeJobs >= concurrencyLimit) {
    job.wait();
  } else {
    job.execute({ timeout });
  }
}
```

## Environment Variables

Create `.env.{environment}` files:

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=debug
AGENT_MAX_CONCURRENT=5
EVALUATION_STRICT_MODE=false

# .env.production
NODE_ENV=production
LOG_LEVEL=warn
AGENT_MAX_CONCURRENT=20
EVALUATION_STRICT_MODE=true
```

## See Also

- `GOVERNANCE.md` — Configuration standards, review process
- `__tests__/` — Configuration examples

---

## Enlaces relacionados

- [[lib/config/README|config]]
- [[README|Inicio]]
