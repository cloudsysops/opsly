#!/usr/bin/env npx tsx

/**
 * Mock Claude Agent Service
 *
 * Simulates Claude API responses for local testing
 * without requiring actual API key or network calls
 */

import express from 'express';

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '5002');
const MOCK_DELAY = parseInt(process.env.MOCK_DELAY || '3000');

interface ChatRequest {
  job_id: string;
  prompt_content: string;
  agent_role: string;
  model: string;
  max_steps: number;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'mock-claude-agent' });
});

// Chat endpoint (matches Claude API format)
app.post('/chat', async (req, res) => {
  const { job_id, prompt_content, agent_role, model } = req.body as ChatRequest;

  console.log(`[MockClaude] Received job ${job_id}`);
  console.log(`[MockClaude] Role: ${agent_role}, Model: ${model}`);

  try {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

    // Generate mock response
    const response = generateMockResponse(agent_role, prompt_content, job_id);

    console.log(`[MockClaude] ✅ Job ${job_id} completed`);

    // Return Claude API format response
    res.status(200).json({
      success: true,
      job_id,
      content: response,
      model: model || 'claude-opus-4',
      usage: {
        input_tokens: Math.floor(Math.random() * 1000 + 500),
        output_tokens: Math.floor(Math.random() * 500 + 200),
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[MockClaude] ❌ Job ${job_id} failed:`, error);
    res.status(500).json({
      success: false,
      job_id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Generate mock response based on agent role
 */
function generateMockResponse(role: string, prompt: string, jobId: string): string {
  const timestamp = new Date().toISOString();
  const taskType = detectTaskType(prompt);

  let response = '';

  switch (taskType) {
    case 'validation-pipeline':
      response = generateValidationPipelineDesign(jobId);
      break;
    case 'security-audit':
      response = generateSecurityAudit(jobId);
      break;
    case 'architecture':
      response = generateArchitectureDecision(jobId);
      break;
    case 'planning':
      response = generatePlanning(jobId);
      break;
    default:
      response = generateGenericAnalysis(prompt, jobId);
  }

  return `
# Analysis - ${role}

**Job ID:** ${jobId}
**Generated:** ${timestamp}
**Service:** mock-claude-agent
**Model:** claude-opus-4

${response}

---

## Analysis Summary
- Status: ✅ Success
- Processing Time: ${MOCK_DELAY}ms
- Agent Role: ${role}
- Confidence: High
- Analysis Type: ${taskType}

This is a mock response for testing parallel execution pipeline.
`.trim();
}

/**
 * Detect task type from prompt
 */
function detectTaskType(prompt: string): string {
  if (prompt.includes('validation') || prompt.includes('pipeline')) return 'validation-pipeline';
  if (prompt.includes('security') || prompt.includes('audit')) return 'security-audit';
  if (prompt.includes('architecture') || prompt.includes('design')) return 'architecture';
  if (prompt.includes('plan') || prompt.includes('strategy')) return 'planning';
  return 'generic';
}

/**
 * Generate validation pipeline design
 */
function generateValidationPipelineDesign(jobId: string): string {
  return `
## Validation Pipeline Architecture

### Overview
The autonomous execution system requires a robust validation pipeline to ensure code quality before deployment.

### Current State
Sequential pipeline:
\`\`\`
TypeScript Check (15s) → Test Execution (20s) → Build (10s)
Total: 45s per job
\`\`\`

### Proposed Optimizations

#### 1. Parallel Type-Check and Testing
- **Why:** Type-checking and tests are independent operations
- **Implementation:** Run in parallel threads
- **Benefit:** Reduces pipeline to 20s (max of the two)

#### 2. Conditional Build
- **Why:** Build should only run if tests pass
- **Implementation:** Build only proceeds after validation passes
- **Benefit:** Prevents invalid code from being bundled

#### 3. Caching Layer
- **Why:** Repeated validations on same code are wasteful
- **Implementation:** Hash source files, cache results
- **Benefit:** 80% reduction in validation time for unchanged files

### Scalability (100 Parallel Jobs)
With proposed optimizations:
- Sequential execution: 100 × 45s = 75 minutes
- With 5-job parallelism: 100 × 20s = 33 minutes
- With caching: Approximately 10-15 minutes average

### Risk Analysis
**Low Risk:**
- Parallel type-check and tests (truly independent)
- Caching is additive (no correctness impact)

**Medium Risk:**
- Conditional build (requires strong test coverage)
- Timeout configuration (may vary by system)

### Recommendation
**Implement:** Phase 1 - Parallel type-check + tests, Phase 2 - Add caching
`;
}

/**
 * Generate security audit
 */
function generateSecurityAudit(jobId: string): string {
  return `
## Security Assessment

### Executive Summary
Comprehensive review of autonomous execution system components. No critical vulnerabilities identified. System follows security best practices for autonomous agent execution.

### Detailed Findings

#### Code Security
- ✅ No SQL injection vulnerabilities
- ✅ Proper input validation on HTTP endpoints
- ✅ No hardcoded credentials in code
- ✅ API keys loaded from environment only
- ⚠️ File path operations should validate against directory escape

#### Architecture Security
- ✅ Network isolation via Tailscale VPN
- ✅ HTTP endpoints restricted to authenticated requests
- ✅ Git operations validated before execution
- ⚠️ Rate limiting not implemented

#### Operational Security
- ✅ Error messages don't leak sensitive information
- ✅ Audit logging for all operations
- ⚠️ Webhook validation could be stronger

### Recommendations
1. **Add request size limits** (prevent DoS)
2. **Implement rate limiting** on HTTP endpoints
3. **Validate all file paths** against directory traversal
4. **Add webhook signature validation**

### Approval Decision
**Safe for production deployment** with above recommendations.

All findings are defense-in-depth improvements. No critical blockers.
`;
}

/**
 * Generate architecture decision
 */
function generateArchitectureDesign(jobId: string): string {
  return `
## Architecture Decision Record

### Context
Building a distributed autonomous execution system that routes prompts to multiple AI agent services (Cursor, Claude, Copilot, OpenCode) for parallel execution.

### Problem
- Need to execute tasks on different agents simultaneously
- Agents may be on different machines (Tailscale VPN)
- System should be scalable to 100+ parallel jobs
- Need to handle failures and retries automatically

### Solution: Distributed HTTP-based Agent Services

#### Design
\`\`\`
Orchestrator (Central Queue Manager)
    ↓ HTTP POST
[Cursor Service] [Claude Service] [Copilot Service] [OpenCode Service]
    ↓                 ↓                 ↓                  ↓
  Local IDE      Claude API      Copilot API         OpenCode API
\`\`\`

#### Key Decisions

**1. HTTP over File IPC**
- Pro: Scalable to remote machines, no filesystem coupling
- Con: Network overhead (minimal at 100ms RTT)
- Chosen: HTTP ✅

**2. Tailscale VPN for Security**
- Pro: Encrypted, authenticated, no firewall complexity
- Con: Requires Tailscale installation
- Chosen: Tailscale ✅

**3. BullMQ for Job Queue**
- Pro: Distributed, persistent, automatic retries
- Con: Redis dependency
- Chosen: BullMQ ✅

**4. Environment-based Configuration**
- Pro: Same code, different endpoints (local/tailscale/remote)
- Con: Must manage multiple configs
- Chosen: Environment Variables ✅

### Trade-offs Accepted
- ✅ HTTP latency vs simplicity (acceptable: <100ms)
- ✅ Tailscale requirement vs security (justified: MCP/VPN standard)
- ✅ Redis dependency vs reliability (justified: BullMQ standard)

### Success Metrics
- Jobs execute in parallel: ✅
- 4+ concurrent tasks: ✅
- Automatic retry on failure: ✅
- Scales to 100 jobs: ✅
- Agent services can be remote: ✅
`;
}

/**
 * Generate planning document
 */
function generatePlanning(jobId: string): string {
  return `
## Implementation Plan

### Phase 1: Foundation (Week 1)
- [x] Agent Service Registry (configuration)
- [x] LocalAgentHTTPWorker (routing)
- [x] Job Queue Integration (BullMQ)
- [x] Tailscale Configuration
- [ ] Deploy to production machines

### Phase 2: Validation (Week 2)
- [ ] Implement TestValidatorWorker
- [ ] Add type-check → test → build pipeline
- [ ] Auto-commit on success
- [ ] Error handling and escalation

### Phase 3: Intelligence (Week 3)
- [ ] IterationManager (suggest next prompts)
- [ ] AgentTrainer (learn patterns)
- [ ] Parallel agent routing
- [ ] Response consolidation

### Phase 4: Autonomy (Week 4)
- [ ] 24/7 autonomous loop
- [ ] Self-healing on failures
- [ ] Cost optimization
- [ ] Monitoring and alerting

### Critical Path
Agent Services → Job Queue → Validation → Autonomy

### Risk Mitigation
- Mock services for testing (low risk)
- Gradual rollout to production (phased)
- Automatic rollback on errors (safety)
- Human approval gates initially (safety)
`;
}

/**
 * Generate generic analysis
 */
function generateGenericAnalysis(prompt: string, jobId: string): string {
  return `
## Analysis Response

### Prompt Summary
${prompt.substring(0, 300)}${prompt.length > 300 ? '...' : ''}

### Key Insights
1. System is well-architected for distributed execution
2. Parallel agent execution provides 2-3x speedup
3. Tailscale VPN ensures security without complexity
4. Mock services enable local testing

### Recommendations
- Proceed with deployment to MacBooks
- Monitor job queue for performance
- Add alerting for failed jobs
- Plan for scaling to 24/7 operation

### Next Steps
1. Start agent services on remote machines
2. Resubmit pending jobs to queue
3. Monitor execution and response generation
4. Validate end-to-end pipeline
`;
}

// Start server
app.listen(PORT, () => {
  console.log(`[MockClaude] 🚀 Mock Claude Agent Service listening on port ${PORT}`);
  console.log(`[MockClaude] Health endpoint: http://localhost:${PORT}/health`);
  console.log(`[MockClaude] Chat endpoint: POST http://localhost:${PORT}/chat`);
  console.log(`[MockClaude] Mock delay: ${MOCK_DELAY}ms`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[MockClaude] Shutting down...');
  process.exit(0);
});
