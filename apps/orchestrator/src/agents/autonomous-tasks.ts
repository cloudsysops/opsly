/**
 * Autonomous Teams — 4 agentes paralelos × 3 PRs = 12 tareas críticas
 * Optimizadas para 16GB RAM máquina worker
 * Framework: CrewAI + LangGraph
 */

export interface AutonomousTask {
  id: string;
  title: string;
  agent: 'dev' | 'devops' | 'security' | 'cost-optimizer';
  priority: number;
  prUrl: string;
  description: string;
  acceptanceCriteria: string[];
  estimatedHours: number;
  blockedBy?: string[];
  dependencies?: string[];
  costEstimate?: {
    llmCalls: number;
    tokensEstimated: number;
    preferredModels: string[];
  };
  tags: string[];
}

/**
 * DEV AGENT — 3 PRs de feature + bugfix + refactoring
 * Owner: TypeScript, tests, commits automáticos vía Cursor
 */
export const devAgentTasks: AutonomousTask[] = [
  {
    id: 'dev-001',
    title: 'ADR-015: Implement LLM Router with Cost Awareness',
    agent: 'dev',
    priority: 1,
    prUrl: 'https://github.com/cloudsysops/opsly/pull/dev-001',
    description: `
      Create routing logic for LLM calls:
      - Ollama local (free) → Haiku (cheap) → GPT-4o-mini → Sonnet (premium)
      - Fallback strategy based on complexity + cost budget
      - Implement in apps/orchestrator/src/llm/router.ts
      - Wire into llm-gateway for automatic routing
      - Unit tests: Vitest, 100% coverage
    `,
    acceptanceCriteria: [
      'Router prioritizes Ollama for low-complexity requests',
      'Fallback chain tested with mock responses',
      'Cost tracking integrated with Hermes metering',
      'Tests pass in CI/CD pipeline',
      'Documentation in ARCHITECTURE.md',
    ],
    estimatedHours: 8,
    blockedBy: [],
    dependencies: [],
    costEstimate: {
      llmCalls: 15,
      tokensEstimated: 45000,
      preferredModels: ['claude-haiku-4-5', 'gpt-4o-mini'],
    },
    tags: ['feature', 'cost-optimization', 'LLM', 'routing'],
  },
  {
    id: 'dev-002',
    title: 'Fix: Replace `any` TypeScript violations in orchestrator',
    agent: 'dev',
    priority: 2,
    prUrl: 'https://github.com/cloudsysops/opsly/pull/dev-002',
    description: `
      Remove all TypeScript \`any\` types (decision: NEVER any):
      - Scan: apps/orchestrator/src/**/*.ts
      - Create proper types in src/types.ts
      - Use generics where needed
      - Update interfaces for worker responses
      - Vitest coverage for type safety
    `,
    acceptanceCriteria: [
      'No TypeScript `any` types remain in orchestrator',
      'All generics properly bounded',
      'Type errors in CI/CD pass',
      'PR annotations explain type choices',
      'Refactoring does not change runtime behavior',
    ],
    estimatedHours: 6,
    blockedBy: [],
    dependencies: [],
    costEstimate: {
      llmCalls: 8,
      tokensEstimated: 32000,
      preferredModels: ['claude-haiku-4-5'],
    },
    tags: ['bugfix', 'type-safety', 'refactoring'],
  },
  {
    id: 'dev-003',
    title: 'Feature: Real-time Agent Observability Dashboard',
    agent: 'dev',
    priority: 3,
    prUrl: 'https://github.com/cloudsysops/opsly/pull/dev-003',
    description: `
      Build real-time dashboard for agent execution:
      - WebSocket endpoint: /api/admin/agents/observe
      - Stream: agent status, task progress, decisions, cost tracking
      - Frontend: apps/admin (React + SWR)
      - Integration with AgentOps telemetry
      - Display: 4 agent cards (dev, devops, security, cost-optimizer)
    `,
    acceptanceCriteria: [
      'WebSocket endpoint returns 101 upgrade',
      'Dashboard shows agent status (active/idle/blocked)',
      'Cost tracking updates in real-time',
      'Supports 16GB RAM without memory leaks',
      'Tests: integration + performance',
    ],
    estimatedHours: 10,
    blockedBy: ['dev-001'],
    dependencies: ['backend-task'],
    costEstimate: {
      llmCalls: 12,
      tokensEstimated: 50000,
      preferredModels: ['claude-sonnet-4-6'],
    },
    tags: ['feature', 'observability', 'real-time'],
  },
];

/**
 * DEVOPS AGENT — 3 PRs de deploy, scaling, health checks
 * Owner: Infraestructura, Docker Compose, health, rollback
 */
export const devopsAgentTasks: AutonomousTask[] = [
  {
    id: 'devops-001',
    title: 'Docker Compose Optimization: Memory Limits + YAML Anchors',
    agent: 'devops',
    priority: 1,
    prUrl: 'https://github.com/cloudsysops/opsly/pull/devops-001',
    description: `
      Apply 3 critical optimizations to docker-compose.platform.yml:
      1. Add memory limits (orchestrator 1G, hermes 512M, context-builder 512M, cadvisor 256M)
      2. Create YAML anchor x-healthcheck-node for 9 services with duplicated healthcheck
      3. Centralize Supabase env config using x-env-supabase anchor

      Reference: memory/simplify_opsly_2026-04-13.md
    `,
    acceptanceCriteria: [
      'Memory limits applied to 7 services',
      'YAML anchors reduce duplication by 40+%',
      'docker-compose config validate passes',
      'No service regressions in staging',
      'Runbook created for rollback',
    ],
    estimatedHours: 3,
    blockedBy: [],
    dependencies: [],
    costEstimate: {
      llmCalls: 5,
      tokensEstimated: 20000,
      preferredModels: ['claude-haiku-4-5'],
    },
    tags: ['bugfix', 'infra', 'optimization', 'docker'],
  },
  {
    id: 'devops-002',
    title: 'Implement ArchitectSenior Health Check Endpoint',
    agent: 'devops',
    priority: 2,
    prUrl: 'https://github.com/cloudsysops/opsly/pull/devops-002',
    description: `
      Create real ArchitectSenior health monitoring:
      - Endpoint: POST /api/admin/health/architect-senior
      - Returns: OrchestratorHealthStatus (queue depths, latencies, cost)
      - Replace mock values in architect-senior.ts:
        - _getTeamLatency: query Prometheus/Hermes real metrics
        - _isHermesTrackingComplete: verify all LLM calls are metered
        - _getTotalMeteringCost: sum actual Hermes metering events
      - Add to VPS monitoring (curl health check every 30s)
    `,
    acceptanceCriteria: [
      'Endpoint returns real queue depths from Redis',
      'Latency metrics from Hermes metering API',
      'Cost tracking accurate to ±5%',
      'Graceful degradation if Hermes unavailable',
      'Documented in API.md',
    ],
    estimatedHours: 5,
    blockedBy: ['dev-001'],
    dependencies: [],
    costEstimate: {
      llmCalls: 6,
      tokensEstimated: 25000,
      preferredModels: ['claude-haiku-4-5'],
    },
    tags: ['feature', 'health-check', 'metrics', 'architect-senior'],
  },
  {
    id: 'devops-003',
    title: 'Implement Automated Rollback Strategy for Agent Failures',
    agent: 'devops',
    priority: 3,
    prUrl: 'https://github.com/cloudsysops/opsly/pull/devops-003',
    description: `
      Design + implement automatic rollback for failed agent tasks:
      - Trigger: Agent task fails 3 consecutive times OR exceeds cost budget
      - Action: Revert to previous Docker image, notify Discord, log to AGENTS.md
      - Monitoring: AgentOps failure detection → Hermes fallback
      - Testing: Chaos engineering (kill random services, verify rollback)
    `,
    acceptanceCriteria: [
      'Rollback completes in <30 seconds',
      'Previous state recoverable within 5min',
      'Discord notification includes failure reason',
      'Chaos tests pass (service kill, network partition)',
      'Runbook documented in docs/',
    ],
    estimatedHours: 7,
    blockedBy: ['devops-002'],
    dependencies: [],
    costEstimate: {
      llmCalls: 9,
      tokensEstimated: 35000,
      preferredModels: ['claude-sonnet-4-6'],
    },
    tags: ['feature', 'resilience', 'rollback', 'disaster-recovery'],
  },
];

/**
 * SECURITY AGENT — 3 PRs de RLS, secret scanning, audit
 * Owner: Seguridad, validación, compliance
 */
export const securityAgentTasks: AutonomousTask[] = [
  {
    id: 'security-001',
    title: 'Validate + Enforce RLS Policies for Multi-Tenant Isolation',
    agent: 'security',
    priority: 1,
    prUrl: 'https://github.com/cloudsysops/opsly/pull/security-001',
    description: `
      Verify Supabase RLS (Row Level Security) policies prevent tenant data leakage:
      - Audit all policies in Supabase project jkwykpldnitavhmtuzmo
      - Test cross-tenant access attempts (should fail)
      - Verify schema isolation (public/tenant_SLUG patterns)
      - Create test suite: tenant-isolation.test.ts
      - Document RLS strategy in ARCHITECTURE.md
    `,
    acceptanceCriteria: [
      'RLS policies cover 100% of tenant-scoped tables',
      'Cross-tenant SELECT/UPDATE/DELETE all denied',
      'Integration tests verify isolation',
      'Performance impact <5% on query latency',
      'Audit log created for RLS violations',
    ],
    estimatedHours: 6,
    blockedBy: [],
    dependencies: [],
    costEstimate: {
      llmCalls: 8,
      tokensEstimated: 30000,
      preferredModels: ['claude-haiku-4-5'],
    },
    tags: ['security', 'compliance', 'rls', 'multi-tenant'],
  },
  {
    id: 'security-002',
    title: 'Secret Scanning: Remove hardcoded secrets, rotate tokens',
    agent: 'security',
    priority: 1,
    prUrl: 'https://github.com/cloudsysops/opsly/pull/security-002',
    description: `
      Scan + remove all hardcoded secrets from codebase:
      - Tool: git-secrets + truffleHog + custom regex
      - Rotate: GITHUB_TOKEN, DISCORD_WEBHOOK_URL, RESEND_API_KEY (via Doppler)
      - Add pre-commit hook to prevent future violations
      - Log findings in security audit trail
      - Notify if any secrets leaked to GitHub history
    `,
    acceptanceCriteria: [
      'Zero hardcoded secrets found in code/config',
      'All tokens rotated and verified',
      'Pre-commit hook blocks secret commits',
      'Git history cleaned (if needed)',
      'Security audit log created',
    ],
    estimatedHours: 4,
    blockedBy: [],
    dependencies: [],
    costEstimate: {
      llmCalls: 4,
      tokensEstimated: 15000,
      preferredModels: ['claude-haiku-4-5'],
    },
    tags: ['security', 'secrets', 'compliance'],
  },
  {
    id: 'security-003',
    title: 'Audit Log + Compliance Report for Second Customer Onboarding',
    agent: 'security',
    priority: 2,
    prUrl: 'https://github.com/cloudsysops/opsly/pull/security-003',
    description: `
      Create comprehensive audit trail for second customer:
      - Log all provisioning steps (schema creation, RLS, secrets)
      - Compliance checklist: GDPR, SOC2 pre-checks
      - Generate audit report (PDF) for customer + legal
      - Integration: Supabase audit logs → Discord notification
      - Store evidence in Stripe metadata (for SaaS compliance)
    `,
    acceptanceCriteria: [
      'Audit log captures 100% of provisioning actions',
      'Compliance report auto-generated',
      'Customer can access audit trail via API',
      'Legal team signs off on template',
      'Tested with second customer onboarding flow',
    ],
    estimatedHours: 8,
    blockedBy: ['security-001'],
    dependencies: ['second-customer-pr'],
    costEstimate: {
      llmCalls: 10,
      tokensEstimated: 40000,
      preferredModels: ['claude-sonnet-4-6'],
    },
    tags: ['security', 'compliance', 'audit', 'second-customer'],
  },
];

/**
 * COST-OPTIMIZER AGENT — 3 PRs de routing, metering, budget
 * Owner: LLM cost, metering, budget tracking, optimization
 */
export const costOptimizerAgentTasks: AutonomousTask[] = [
  {
    id: 'cost-001',
    title: 'Hermes Metering: 100% Coverage for All LLM Calls',
    agent: 'cost-optimizer',
    priority: 1,
    prUrl: 'https://github.com/cloudsysops/opsly/pull/cost-001',
    description: `
      Ensure every LLM call is metered (current: partial):
      - Audit: Find unmeasured calls in context-builder, llm-gateway, agents
      - Implement: Hermes wrapper around all LLM providers
      - Track: model, tokens, latency, cost_usd, cache_hit
      - Integration: Hermes metering → BigQuery analytics
      - Dashboard: Show cost by model/tenant/time
    `,
    acceptanceCriteria: [
      '100% of LLM calls tracked in Hermes',
      'Cost accuracy within ±2%',
      'BigQuery syncs daily',
      'Dashboard shows cost trends',
      'Cost per tenant/model visible',
    ],
    estimatedHours: 7,
    blockedBy: [],
    dependencies: [],
    costEstimate: {
      llmCalls: 12,
      tokensEstimated: 50000,
      preferredModels: ['claude-sonnet-4-6'],
    },
    tags: ['cost-optimization', 'metering', 'tracking'],
  },
  {
    id: 'cost-002',
    title: 'Budget Alerts + Spend Control for LLM Cost',
    agent: 'cost-optimizer',
    priority: 2,
    prUrl: 'https://github.com/cloudsysops/opsly/pull/cost-002',
    description: `
      Implement spending guardrails:
      - Set budgets per tenant/model/week (configurable)
      - Alert: Discord notification at 50%, 75%, 90%, 100% budget
      - Soft limit: Reduce model priority (Claude→Haiku, fallback to Ollama)
      - Hard limit: Block new requests at 100% (with approval override)
      - Sync: Budgets from Stripe pricing tiers
    `,
    acceptanceCriteria: [
      'Budgets enforce at runtime (no overspend)',
      'Alerts sent to Discord + admin dashboard',
      'Soft/hard limits work correctly',
      'Overflow handled gracefully (no customer impact)',
      'Tested with multiple tenants + models',
    ],
    estimatedHours: 6,
    blockedBy: ['cost-001'],
    dependencies: [],
    costEstimate: {
      llmCalls: 8,
      tokensEstimated: 32000,
      preferredModels: ['claude-haiku-4-5'],
    },
    tags: ['cost-optimization', 'budget', 'guardrails'],
  },
  {
    id: 'cost-003',
    title: 'Cost Analytics: Model ROI + Optimization Playbook',
    agent: 'cost-optimizer',
    priority: 3,
    prUrl: 'https://github.com/cloudsysops/opsly/pull/cost-003',
    description: `
      Analyze cost data and create optimization playbook:
      - Query: BigQuery (cost by model, latency, quality)
      - Benchmark: Ollama vs. Haiku vs. GPT-4o-mini vs. Sonnet
      - ROI: Cost per task completion
      - Playbook: "Kings of Optimization" (recommendations + runbook)
      - Publish: docs/COST-OPTIMIZATION-PLAYBOOK.md
    `,
    acceptanceCriteria: [
      'ROI analysis covers all models in use',
      'Playbook provides 3+ actionable optimizations',
      'Projected savings calculated',
      'A/B test recommendations included',
      'Team can execute playbook in <1 day',
    ],
    estimatedHours: 8,
    blockedBy: ['cost-001', 'cost-002'],
    dependencies: [],
    costEstimate: {
      llmCalls: 10,
      tokensEstimated: 45000,
      preferredModels: ['claude-sonnet-4-6'],
    },
    tags: ['cost-optimization', 'analytics', 'playbook'],
  },
];

/**
 * Consolidate all tasks
 */
export const allAutonomousTasks: AutonomousTask[] = [
  ...devAgentTasks,
  ...devopsAgentTasks,
  ...securityAgentTasks,
  ...costOptimizerAgentTasks,
];

/**
 * Helper: Get tasks by agent
 */
export function getTasksByAgent(
  agent: 'dev' | 'devops' | 'security' | 'cost-optimizer'
): AutonomousTask[] {
  return allAutonomousTasks.filter((t) => t.agent === agent);
}

/**
 * Helper: Estimate total cost
 */
export function estimateTotalCost(): {
  totalLLMCalls: number;
  totalTokens: number;
  estimatedCost: number;
} {
  const totalLLMCalls = allAutonomousTasks.reduce(
    (sum, t) => sum + (t.costEstimate?.llmCalls || 0),
    0
  );
  const totalTokens = allAutonomousTasks.reduce(
    (sum, t) => sum + (t.costEstimate?.tokensEstimated || 0),
    0
  );

  // Rough estimate: Haiku ~$0.80/1M tokens, Sonnet ~$3/1M tokens
  const haikuTokens = totalTokens * 0.7; // 70% Haiku
  const sonnetTokens = totalTokens * 0.3; // 30% Sonnet
  const estimatedCost = (haikuTokens / 1_000_000) * 0.8 + (sonnetTokens / 1_000_000) * 3;

  return {
    totalLLMCalls,
    totalTokens,
    estimatedCost,
  };
}
