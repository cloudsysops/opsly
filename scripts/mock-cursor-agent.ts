#!/usr/bin/env npx tsx

/**
 * Mock Cursor Agent Service
 *
 * Simulates the real Cursor Agent Service for local testing
 * without requiring actual Cursor IDE or remote machine connection
 */

import express from 'express';
import { promises as fsp } from 'fs';
import * as path from 'path';

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '5001');
const MOCK_DELAY = parseInt(process.env.MOCK_DELAY || '2000'); // 2 second simulated execution

interface ExecuteRequest {
  job_id: string;
  prompt_content: string;
  agent_role: string;
  max_steps: number;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'mock-cursor-agent' });
});

// Main execution endpoint
app.post('/execute', async (req, res) => {
  const { job_id, prompt_content, agent_role, max_steps } = req.body as ExecuteRequest;

  console.log(`[MockCursor] Received job ${job_id}`);
  console.log(`[MockCursor] Role: ${agent_role}, Max steps: ${max_steps}`);

  try {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

    // Generate mock response based on agent role
    const response = generateMockResponse(agent_role, prompt_content, job_id);

    console.log(`[MockCursor] ✅ Job ${job_id} completed`);

    // Return response
    res.status(200).json({
      success: true,
      job_id,
      response_content: response,
      processed_at: new Date().toISOString(),
      execution_time_ms: MOCK_DELAY,
    });
  } catch (error) {
    console.error(`[MockCursor] ❌ Job ${job_id} failed:`, error);
    res.status(500).json({
      success: false,
      job_id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Generate mock response based on task type
 */
function generateMockResponse(role: string, prompt: string, jobId: string): string {
  const timestamp = new Date().toISOString();
  const mockTask = detectTaskType(prompt);

  let response = '';

  switch (mockTask) {
    case 'test-utilities':
      response = generateTestUtilitiesResponse(jobId);
      break;
    case 'validation-pipeline':
      response = generateValidationPipelineResponse(jobId);
      break;
    case 'security-audit':
      response = generateSecurityAuditResponse(jobId);
      break;
    case 'observability':
      response = generateObservabilityResponse(jobId);
      break;
    default:
      response = generateGenericResponse(prompt, jobId);
  }

  return `
# Mock Response - ${role}

**Job ID:** ${jobId}
**Generated:** ${timestamp}
**Service:** mock-cursor-agent

${response}

---

## Execution Summary
- Status: ✅ Success
- Processing Time: ${MOCK_DELAY}ms
- Agent Role: ${role}
- Mock Response Type: ${mockTask}

This is a mock response for testing purposes. Replace with real agent output when services are deployed.
`.trim();
}

/**
 * Detect task type from prompt content
 */
function detectTaskType(prompt: string): string {
  if (prompt.includes('test') || prompt.includes('utilities')) return 'test-utilities';
  if (prompt.includes('validation') || prompt.includes('pipeline')) return 'validation-pipeline';
  if (prompt.includes('security') || prompt.includes('audit')) return 'security-audit';
  if (prompt.includes('metrics') || prompt.includes('observability')) return 'observability';
  return 'generic';
}

/**
 * Generate test utilities response
 */
function generateTestUtilitiesResponse(jobId: string): string {
  return `
## Test Utilities Implementation

Created \`src/test-utils.ts\` with the following utilities:

\`\`\`typescript
// Test utilities for autonomous execution system
export async function createTestEnvironment() {
  // Setup test database
  // Configure test services
  // Return test context
}

export async function cleanupTestEnvironment() {
  // Teardown test database
  // Clear test files
  // Reset services
}

export function mockAgentService(serviceName: string, responses: any[]) {
  // Mock service implementation
  // Return mock instance with responses
}

export async function runValidationPipeline(jobId: string) {
  // Run type-check → test → build
  // Return validation results
}
\`\`\`

**Coverage:**
- Type checking utilities
- Test environment setup/teardown
- Mock agent services
- Validation pipeline runner

**Status:** ✅ Ready for integration testing
`;
}

/**
 * Generate validation pipeline response
 */
function generateValidationPipelineResponse(jobId: string): string {
  return `
## Validation Pipeline Design

### Current Flow Analysis
\`\`\`
type-check → test → build (sequential)
├─ type-check: TypeScript compilation
├─ test: Unit tests + integration tests
└─ build: Production bundle
\`\`\`

### Optimizations
**Parallel Opportunities:**
- Type-check and test can run in parallel (independent)
- Build must wait for tests (tests validate code)

**Sequential Requirements:**
- Build waits for type-check (needs compiled types)
- Tests must complete before build (quality gate)

### Time Savings
- Current: 45s (15s + 20s + 10s sequential)
- Optimized: 30s (15s + 20s parallel, then 10s build)
- **Improvement: 33% faster**

### Scalability (100 parallel jobs)
With parallel validation and caching:
- 100 jobs × 30s = 3000s total execution
- With job queue optimization: ~500s (5 jobs in parallel)

### Recommendation
**Approach: Parallel Type-Check + Test, Sequential Build**

Trade-off: Minimal complexity increase, significant performance gain.
`;
}

/**
 * Generate security audit response
 */
function generateSecurityAuditResponse(jobId: string): string {
  return `
## Security Code Audit

### Files Reviewed
- \`apps/orchestrator/src/lib/iteration-manager.ts\`
- \`apps/orchestrator/src/workers/TestValidatorWorker.ts\`
- \`scripts/local-prompt-watcher.ts\`
- \`scripts/local-git-auto-commit.ts\`

### Critical Findings
None identified. Code follows security best practices.

### High Priority
- Add rate limiting to HTTP endpoints
- Implement request validation for prompt injection prevention

### Medium Priority
- Add error logging with context
- Improve error messages (don't leak paths)

### Recommendations
1. ✅ No token leakage identified
2. ✅ File path validation adequate
3. ⚠️ Add request size limits (prevent DoS)
4. ⚠️ Implement audit logging for all operations

### Approval
**Status: Safe for production with above recommendations**

All recommendations are for defense-in-depth; no critical blockers.
`;
}

/**
 * Generate observability response
 */
function generateObservabilityResponse(jobId: string): string {
  return `
## Execution Metrics Implementation

Created \`apps/orchestrator/src/lib/execution-metrics.ts\`:

\`\`\`typescript
export class MetricsCollector {
  recordValidation(jobId: string, status: 'pass' | 'fail', durationMs: number)
  recordIteration(jobId: string, attempt: number, success: boolean)
  recordCommit(jobId: string, filesChanged: number)
  getStats(): AggregatedMetrics
  exportJSON(): string
}

interface AggregatedMetrics {
  totalJobs: number
  successRate: number
  avgValidationTimeMs: number
  avgIterationsToSuccess: number
  errorsByType: Record<string, number>
  perAgentRoleBreakdown: Record<string, any>
}
\`\`\`

### Metrics Tracked
- Total jobs executed
- Success rate (%)
- Avg validation time
- Avg iterations to success
- Files changed per job
- Errors by type (type-check, test, build)
- Per-agent role breakdown

### Export Capabilities
- Console output every 100 jobs
- JSON export for external monitoring
- Prometheus metrics endpoint

### Integration Points
✅ Hooked into TestValidatorWorker
✅ Hooked into IterationManager
✅ Hooked into LocalGitAutoCommit

**Status:** Ready for integration
`;
}

/**
 * Generate generic response
 */
function generateGenericResponse(prompt: string, jobId: string): string {
  return `
## Execution Response

Your prompt has been processed successfully.

**Prompt Summary:**
${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}

**Mock Response:**
This is a mock service response for testing purposes. The real agent service would execute the prompt and return actual results.

**Status:** ✅ Simulation completed
`;
}

// Start server
app.listen(PORT, () => {
  console.log(`[MockCursor] 🚀 Mock Cursor Agent Service listening on port ${PORT}`);
  console.log(`[MockCursor] Health endpoint: http://localhost:${PORT}/health`);
  console.log(`[MockCursor] Execute endpoint: POST http://localhost:${PORT}/execute`);
  console.log(`[MockCursor] Mock delay: ${MOCK_DELAY}ms`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[MockCursor] Shutting down...');
  process.exit(0);
});
