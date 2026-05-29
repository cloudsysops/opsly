import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  getWorkingService: vi.fn(),
  getBranchByName: vi.fn(),
  buildMergeAdvisorReport: vi.fn(),
  buildRecoverySnapshot: vi.fn(),
}));

vi.mock('../lib/agent/agent-service-registry.js', () => ({
  getAgentServiceRegistry: () => ({
    getConfig: mocks.getConfig,
    getWorkingService: mocks.getWorkingService,
  }),
}));

vi.mock('@intcloudsysops/git-branch-orchestrator', () => ({
  getBranchByName: mocks.getBranchByName,
  buildMergeAdvisorReport: mocks.buildMergeAdvisorReport,
}));

vi.mock('@intcloudsysops/session-manager', () => ({
  buildRecoverySnapshot: mocks.buildRecoverySnapshot,
}));

import { buildPoppingSubagentPlan, getPoppingSubagentCatalog } from '../lib/popping-subagents.js';

describe('popping subagents', () => {
  it('returns the MVP catalog with sequential default roles', () => {
    const catalog = getPoppingSubagentCatalog();
    expect(catalog.limits.maxPoppingSubagents).toBe(3);
    expect(catalog.activeDefaultRoles.map((role) => role.id)).toEqual([
      'repo-scout',
      'risk-checker',
      'pr-summarizer',
    ]);
  });

  it('builds a sequential plan for PR analysis', async () => {
    mocks.getConfig.mockResolvedValue({
      services: {
        local_cursor: {
          enabled: true,
          url: 'http://cursor:3000',
          type: 'http',
          agent_role: 'executor',
          capabilities: [],
          timeout_ms: 60000,
          retry_attempts: 1,
          retry_backoff_ms: 1000,
          health_check_interval_ms: 30000,
          description: 'cursor worker',
        },
        local_claude: {
          enabled: true,
          url: 'http://claude:3000',
          type: 'http',
          agent_role: 'reviewer',
          capabilities: [],
          timeout_ms: 60000,
          retry_attempts: 1,
          retry_backoff_ms: 1000,
          health_check_interval_ms: 30000,
          description: 'claude worker',
        },
        local_codex: {
          enabled: true,
          url: 'http://codex:3000',
          type: 'http',
          agent_role: 'executor',
          capabilities: [],
          timeout_ms: 60000,
          retry_attempts: 1,
          retry_backoff_ms: 1000,
          health_check_interval_ms: 30000,
          description: 'codex worker',
        },
      },
      defaults: {
        default_agent: 'local_cursor',
        fallback_chain: ['local_cursor', 'local_claude', 'local_codex'],
      },
    });
    mocks.getWorkingService.mockImplementation(async (worker: string) => {
      if (worker === 'cursor') return { service: { url: 'http://cursor:3000' } };
      if (worker === 'claude') return { service: { url: 'http://claude:3000' } };
      if (worker === 'codex') return { service: { url: 'http://codex:3000' } };
      return null;
    });
    mocks.getBranchByName.mockResolvedValue({
      branch_name: 'feature/runtime',
      job_id: 'job-1',
      worker_id: 'codex',
      task_slug: 'runtime-stability',
      title: 'Stabilize runtime',
      files_touched: ['apps/orchestrator/src/http/routes/mission-control.ts'],
      target_branch: 'feature/integration',
      status: 'active',
      risk_level: 'medium',
      test_status: 'passed',
    });
    mocks.buildMergeAdvisorReport.mockResolvedValue({
      branch_name: 'feature/runtime',
      job_id: 'job-1',
      worker_id: 'codex',
      summary: 'Stabilize runtime',
      files_changed: ['apps/orchestrator/src/http/routes/mission-control.ts'],
      architecture_impact: 'Localized change; review module boundaries in Mission Control.',
      risk_level: 'MODERATE',
      tests_status: 'passed',
      duplicate_logic_warnings: [],
      recommended_action: 'merge_to_integration',
      requires_human_approval: true,
      pr_target: 'feature/integration',
      generated_at: '2026-05-16T00:00:00.000Z',
    });

    const plan = await buildPoppingSubagentPlan({
      goal: 'analyze this PR',
      branchName: 'feature/runtime',
      tenantSlug: 'intcloudsysops',
    });

    expect(plan.strategy).toBe('sequential');
    expect(plan.activeRoles.map((role) => role.id)).toEqual([
      'repo-scout',
      'risk-checker',
      'pr-summarizer',
    ]);
    expect(plan.analysis.risk).toBe('MODERATE');
    expect(plan.analysis.humanApprovalRequired).toBe(true);
    expect(plan.analysis.filesTouched).toContain(
      'apps/orchestrator/src/http/routes/mission-control.ts'
    );
    expect(plan.missionControlHint).toContain('repo-scout -> risk-checker -> pr-summarizer');
  });
});
