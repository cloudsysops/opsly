---
title: 'Library Modules Integration Guide'
description: 'Integration guide for all Opsly reusable library modules'
---

# Library Modules Integration Guide

Enterprise-scale reusable library modules for Opsly. All 18+ apps use these modules to avoid duplication and maintain consistency.

## Quick Start

All modules are **workspace packages**. Install once at root:

```bash
npm install    # Installs all workspaces including lib/
```

Each module is independently versioned and can be published to npm if needed.

## Modules Overview

### Core Infrastructure (4 modules)

#### 1. @intcloudsysops/prompts

Centralized prompt registry. All prompts (agents, services, workflows) in one place with semantic versioning and rollback.

**Location:** `lib/prompts/`

**Use Case:** Load prompts dynamically without hardcoding.

```typescript
import { loadPrompt, listPrompts } from '@intcloudsysops/prompts';

// Load current version
const prompt = await loadPrompt('local-services-automation');

// Load specific version
const oldPrompt = await loadPrompt('agent-name', { version: '1.0.0' });

// List all available
const all = listPrompts();
```

**Integration:**

- **Orchestrator** (`apps/orchestrator/`) — Load agent prompts before execution
- **API** (`apps/api/`) — Serve prompts to frontend
- **Agents** (`tools/agents/`) — Load prompts for inference

**Governance:** See `lib/prompts/GOVERNANCE.md`

---

#### 2. @intcloudsysops/observability

Unified logging, metrics, and tracing across all services.

**Location:** `lib/observability/`

**Use Case:** Consistent observability without vendor lock-in.

```typescript
import { createLogger, recordMetric, createTracer } from '@intcloudsysops/observability';

const logger = createLogger('my-service');

// Log with context
logger.info('Agent started', { agentId: 'a123', userId: 'u456' });

// Record metrics
recordMetric('agent_executions', 1, { agentId: 'a123' });
recordMetric('latency_ms', 250);

// Trace requests
const tracer = createTracer();
const span = tracer.startSpan('process-request');
span.setAttribute('userId', 'u456');
// ... do work ...
span.end('success');
```

**Integration:**

- **All services** must instrument with `createLogger()` and `recordMetric()`
- **API routes** use observability middleware for HTTP tracing
- **Orchestrator** tracks agent execution metrics
- **Gateway** records LLM provider costs and latency

**Required Metrics Per Service:**

- `{service}_requests_total` (counter)
- `{service}_request_duration_ms` (histogram)
- `{service}_errors_total` (counter)

**Governance:** See `lib/observability/GOVERNANCE.md`

---

#### 3. @intcloudsysops/components

Shared React component library + design system for portal, admin, local-services.

**Location:** `lib/components/`

**Use Case:** Avoid rewriting Button, Form, Modal, etc. in every app.

```typescript
import { Button, Form, FormField, Card, useAuth, useTheme } from '@intcloudsysops/components';
import '@intcloudsysops/components/styles'; // Import design system CSS

function MyPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <Card>
      <h1>Hello, {user?.name}</h1>
      <Button onClick={toggleTheme}>Toggle {theme} mode</Button>
    </Card>
  );
}
```

**Available Components:**

- **UI:** Button, Form, FormField, Card, Modal
- **Hooks:** useAuth, useTheme, useAPI
- **Styles:** Design tokens (colors, spacing, typography)

**Integration:**

- **Portal** (`apps/portal/`) — Dashboard UI
- **Admin** (`apps/admin/`) — Administration interface
- **Local Services** (`apps/local-services/`) — Local UI

**Accessibility:** All components WCAG 2.1 AA compliant.

**Storybook:** View components isolated:

```bash
npm run storybook --workspace=@intcloudsysops/components
```

**Governance:** See `lib/components/GOVERNANCE.md`

---

#### 4. @intcloudsysops/evaluation

Testing, validation, and quality metrics framework. Automated QA gates.

**Location:** `lib/evaluation/`

**Use Case:** Validate agent outputs before returning to users.

```typescript
import {
  validateInput,
  checkForPII,
  checkForHallucinations,
  scoreQuality,
  runSmokeTests,
  runRegressionTests,
} from '@intcloudsysops/evaluation';

// Validate input schema
const validation = validateInput(userInput, agentSchema);
if (!validation.valid) throw new Error('Invalid input');

// Check safety
const piiErrors = checkForPII(agentOutput);
if (piiErrors.length > 0) return res.status(400).json({ error: 'Safety check failed' });

// Calculate quality
const metrics = scoreQuality(referenceOutput, generatedOutput);
if (metrics.bleu < 0.45) console.warn('Quality regression detected');

// Run test suite
const results = await runRegressionTests([
  { name: 'test-1', input: { query: 'hello' }, expectedOutput: 'greeting' },
]);
```

**Quality Baselines** (per-agent):

- BLEU ≥ 0.45
- ROUGE ≥ 0.50
- Latency ≤ 500ms
- Error rate ≤ 5%

**Test Datasets:**

- **Golden:** `lib/evaluation/datasets/golden/` — Reference outputs for regression
- **Adversarial:** `lib/evaluation/datasets/adversarial/` — Edge cases, jailbreaks

**Integration:**

- **Orchestrator** (`apps/orchestrator/`) — Run smoke tests before agent execution
- **API** (`apps/api/`) — Validate outputs, check for PII
- **CI/CD** — Run regression tests before deploy

**Governance:** See `lib/evaluation/GOVERNANCE.md`

---

### Enterprise Utilities (9 modules)

#### 5. @intcloudsysops/errors

Unified error handling with consistent response format and context tracking.

**Location:** `lib/errors/`

**Use Case:** Standardize error responses across all services.

```typescript
import { ValidationError, NotFoundError, handleError } from '@intcloudsysops/errors';

try {
  throw new ValidationError('Invalid email', { field: 'email' });
} catch (error) {
  const response = handleError(error);
  // { code: 'VALIDATION_ERROR', statusCode: 400, message: '...', context: {...} }
}
```

**Integration:** All API routes and services.

**Governance:** See `lib/errors/GOVERNANCE.md`

---

#### 6. @intcloudsysops/services

Repository pattern with multi-tenant isolation for data access.

**Location:** `lib/services/`

**Use Case:** Prevent accidental cross-tenant data leaks.

```typescript
import { BaseRepository } from '@intcloudsysops/services';

class AgentRepository extends BaseRepository<Agent> {
  constructor(db: Database) {
    super(db, 'agents');
  }
}

// Safe — can't leak data across tenants
const agent = await agentRepo.find('a123', 'tenant-abc');
```

**Integration:** All service layers and data access code.

**Governance:** See `lib/services/GOVERNANCE.md`

---

#### 7. @intcloudsysops/config

Environment configuration and feature flags for safe deployments.

**Location:** `lib/config/`

**Use Case:** Control rollouts and environment-specific behavior.

```typescript
import { getConfig, getFeatureFlags } from '@intcloudsysops/config';

const config = getConfig();
const flags = await getFeatureFlags(tenantId);

if (flags.agentsV2Enabled) {
  // Use new agent version
}
```

**Integration:** All services for config and feature control.

**Governance:** See `lib/config/GOVERNANCE.md`

---

#### 8. @intcloudsysops/security

Authentication, encryption, and PII redaction for compliance.

**Location:** `lib/security/`

**Use Case:** Secure authentication and protect sensitive data.

```typescript
import { generateToken, redactPII, encryptSecret } from '@intcloudsysops/security';

const token = generateToken(user, '7d');
const redacted = redactPII('User john@example.com called from 555-1234');
const encrypted = encryptSecret(apiKey);
```

**Integration:** API authentication, data protection, compliance logging.

**Governance:** See `lib/security/GOVERNANCE.md`

---

#### 9. @intcloudsysops/api-utils

Unified API response format, pagination, and versioning.

**Location:** `lib/api/`

**Use Case:** Consistent API responses for all endpoints.

```typescript
import { createResponse, createErrorResponse } from '@intcloudsysops/api';

// Success
res.json(createResponse({ agents: [...] }, requestId));

// Error
res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid input', requestId));
```

**Integration:** All API routes in `apps/api/`.

**Governance:** See `lib/api/GOVERNANCE.md`

---

#### 10. @intcloudsysops/workflow

Safe agent execution with timeouts and cost tracking.

**Location:** `lib/workflow/`

**Use Case:** Execute agents safely with resource limits.

```typescript
import { executeWithTimeout } from '@intcloudsysops/workflow';

const result = await executeWithTimeout(
  () => agent.execute(input),
  30000, // 30 second timeout
  agentId
);
```

**Integration:** Orchestrator, API, agent execution.

**Governance:** See `lib/workflow/GOVERNANCE.md`

---

#### 11. @intcloudsysops/telemetry

Cost and performance tracking per agent and provider.

**Location:** `lib/telemetry/`

**Use Case:** Track spending and performance metrics.

```typescript
import { Telemetry } from '@intcloudsysops/telemetry';

const telemetry = new Telemetry();
const cost = telemetry.getCostByAgent('agent-id');
const metrics = telemetry.getMetrics('agent-id');
```

**Integration:** Billing, dashboards, cost attribution.

**Governance:** See `lib/telemetry/GOVERNANCE.md`

---

#### 12. @intcloudsysops/testing

Unified test framework for agents and services.

**Location:** `lib/testing/`

**Use Case:** Standardized testing across all agents.

```typescript
import { runTest } from '@intcloudsysops/testing';

const result = await runTest(testCase, (input) => agent.execute(input));
console.log(result.passed);
```

**Integration:** CI/CD pipelines, agent validation.

**Governance:** See `lib/testing/GOVERNANCE.md`

---

#### 13. @intcloudsysops/migrations

Database migration versioning with rollback capability.

**Location:** `lib/migrations/`

**Use Case:** Safe schema changes with rollback.

```typescript
import { MigrationRunner } from '@intcloudsysops/migrations';

const runner = new MigrationRunner(db);
await runner.runAll();
await runner.rollback('001');
```

**Integration:** Application startup, schema management.

**Governance:** See `lib/migrations/GOVERNANCE.md`

---

## Module Governance Summary

| Module        | Versioning       | Review     | Deprecation | Breaking Changes             |
| ------------- | ---------------- | ---------- | ----------- | ---------------------------- |
| prompts       | Semantic (1.0.0) | 1 approval | 2 releases  | MAJOR bump + migration guide |
| observability | Semantic         | 1 approval | 2 releases  | MAJOR bump + migration guide |
| components    | Semantic         | 1 approval | 2 releases  | MAJOR bump + migration guide |
| evaluation    | Semantic         | 1 approval | 2 releases  | MAJOR bump + migration guide |
| errors        | Semantic         | 1 approval | 2 releases  | MAJOR bump + migration guide |
| services      | Semantic         | 1 approval | 2 releases  | MAJOR bump + migration guide |
| config        | Semantic         | 1 approval | 2 releases  | MAJOR bump + migration guide |
| security      | Semantic         | 1 approval | 2 releases  | MAJOR bump + migration guide |
| api           | Semantic         | 1 approval | 2 releases  | MAJOR bump + migration guide |
| workflow      | Semantic         | 1 approval | 2 releases  | MAJOR bump + migration guide |
| telemetry     | Semantic         | 1 approval | 2 releases  | MAJOR bump + migration guide |
| testing       | Semantic         | 1 approval | 2 releases  | MAJOR bump + migration guide |
| migrations    | Semantic         | 1 approval | 2 releases  | MAJOR bump + migration guide |

## Adding New Libraries

1. Create directory: `lib/{module_name}/`
2. Add `package.json` (see template: `lib/prompts/package.json`)
3. Add `README.md` (API docs)
4. Add `GOVERNANCE.md` (versioning, review process)
5. Update `config/modules.json` to register
6. Update main `package.json` to add workspace
7. Update `tsconfig.json` path aliases

## Checking for Duplication

Pre-commit hook automatically checks:

```bash
bash scripts/check-duplicates.sh lib/components lib/services
```

If you see duplicated code:

1. Extract to lib/ module
2. Update imports in all apps
3. Run tests to ensure everything works

## Troubleshooting

### Module not found

```bash
# Reinstall workspaces
npm install

# Verify path aliases in tsconfig.json
grep "@lib" tsconfig.json

# Check workspace config
grep '"@intcloudsysops' pnpm-workspace.yaml
```

### TypeScript errors

```bash
# Regenerate type declarations
npm run build --workspace={module}

# Type check all
npm run type-check
```

### Breaking changes not documented

Before deploying breaking change:

1. Update `lib/{module}/GOVERNANCE.md`
2. Create migration guide in `README.md`
3. Add ADR explaining the change
4. Test all dependent apps

---

## See Also

- `config/modules.json` — Module registry, versions, owners
- `lib/{module}/README.md` — Per-module API documentation
- `lib/{module}/GOVERNANCE.md` — Versioning, review, deprecation rules
- `AGENTS.md` → "Modules & Registries" section
