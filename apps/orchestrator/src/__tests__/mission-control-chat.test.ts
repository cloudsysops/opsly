import { describe, expect, it, vi } from 'vitest';
import type { ServerResponse, IncomingMessage } from 'node:http';

const mocks = vi.hoisted(() => ({
  parseBody: vi.fn(),
  verifyPlatformAdminToken: vi.fn(() => true),
  collectRuntimeHealthSnapshot: vi.fn(),
  listSessions: vi.fn(),
  resumeSession: vi.fn(),
  checkpointSession: vi.fn(),
  stopSession: vi.fn(),
  buildRecoverySnapshot: vi.fn(),
  buildBranchHygieneReport: vi.fn(),
  buildPoppingSubagentPlan: vi.fn(),
}));

vi.mock('../http/utils.js', () => ({
  parseBody: mocks.parseBody,
  verifyPlatformAdminToken: mocks.verifyPlatformAdminToken,
}));

vi.mock('../runtime/runtime-health.js', () => ({
  collectRuntimeHealthSnapshot: mocks.collectRuntimeHealthSnapshot,
}));

vi.mock('@intcloudsysops/session-manager', () => ({
  listSessions: mocks.listSessions,
  resumeSession: mocks.resumeSession,
  checkpointSession: mocks.checkpointSession,
  stopSession: mocks.stopSession,
  buildRecoverySnapshot: mocks.buildRecoverySnapshot,
}));

vi.mock('@intcloudsysops/git-branch-orchestrator', () => ({
  buildBranchHygieneReport: mocks.buildBranchHygieneReport,
}));

vi.mock('../lib/popping-subagents.js', () => ({
  buildPoppingSubagentPlan: mocks.buildPoppingSubagentPlan,
}));

import { handleMissionControlChat } from '../http/routes/mission-control.js';

function createResponse(): ServerResponse & {
  statusCode?: number;
  body?: string;
} {
  return {
    writeHead(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    end(chunk?: unknown) {
      this.body = typeof chunk === 'string' ? chunk : chunk ? String(chunk) : '';
      return this;
    },
  } as ServerResponse & { statusCode?: number; body?: string };
}

function createContext(body: unknown): {
  req: IncomingMessage;
  res: ServerResponse & { statusCode?: number; body?: string };
  params: Record<string, string>;
  query: Record<string, string>;
} {
  mocks.parseBody.mockResolvedValue(body);
  return {
    req: { headers: {} } as IncomingMessage,
    res: createResponse(),
    params: {},
    query: {},
  };
}

describe('mission control chat', () => {
  it('summarizes runtime continuation without mutating state', async () => {
    mocks.collectRuntimeHealthSnapshot.mockResolvedValue({
      timestamp: '2026-05-16T00:00:00.000Z',
      nodes: [],
      queues: [],
      sessionCount: 1,
      sessionSummary: {
        total: 1,
        created: 0,
        running: 1,
        checkpointed: 0,
        waitingApproval: 0,
        stopped: 0,
        failed: 0,
        resumable: 0,
      },
      capabilities: {
        generatedAt: '2026-05-16T00:00:00.000Z',
        summary: 'local-only mode',
        machine: {
          os: 'macos',
          cpuCores: 8,
          ramGb: 16,
          gpuAvailable: true,
          topologyType: 'local-only',
          dockerEngine: 'colima',
          maxLocalWorkers: 2,
          cloudRole: 'none',
        },
        capabilities: [],
        detectedEditors: [],
        detectedAgents: [],
      },
      dryRun: false,
    });
    mocks.listSessions.mockResolvedValue([
      {
        sessionId: 'sess-1',
        name: 'runtime-work',
        agentId: 'codex',
        workspace: '/Users/dragon/cboteros/proyectos/intcloudsysops',
        status: 'running',
        createdAt: '2026-05-16T00:00:00.000Z',
        lastSeenAt: '2026-05-16T00:00:00.000Z',
        tmuxSessionName: 'tmux-sess-1',
      },
    ]);
    mocks.buildRecoverySnapshot.mockResolvedValue({
      sessionId: 'sess-1',
      capturedAt: '2026-05-16T00:00:00.000Z',
      workspace: '/Users/dragon/cboteros/proyectos/intcloudsysops',
      branch: 'feature/runtime',
      agentId: 'codex',
      jobId: 'job-1',
      tmuxAlive: true,
      changedFiles: [],
      branchRegistryMatches: [],
      sessionMeta: {
        sessionId: 'sess-1',
        name: 'runtime-work',
        agentId: 'codex',
        workspace: '/Users/dragon/cboteros/proyectos/intcloudsysops',
        status: 'running',
        createdAt: '2026-05-16T00:00:00.000Z',
        lastSeenAt: '2026-05-16T00:00:00.000Z',
        tmuxSessionName: 'tmux-sess-1',
      },
      recommendedAction: 'continue',
      recommendedActions: ['continue'],
    });
    mocks.buildBranchHygieneReport.mockResolvedValue({
      tenant_slug: 'intcloudsysops',
      initiative_filter: null,
      scanned: 0,
      issues: [],
      recommendations: [],
      generated_at: '2026-05-16T00:00:00.000Z',
    });

    const ctx = createContext({ message: 'continue runtime work' });
    await handleMissionControlChat(ctx);

    expect(ctx.res.statusCode).toBe(200);
    const payload = JSON.parse(ctx.res.body ?? '{}') as { action?: string; reply?: string };
    expect(payload.action).toBe('continue-runtime-work');
    expect(payload.reply).toContain('Session sess-1');
    expect(mocks.resumeSession).not.toHaveBeenCalled();
  });

  it('resumes an explicit session when requested', async () => {
    mocks.collectRuntimeHealthSnapshot.mockResolvedValue({
      timestamp: '2026-05-16T00:00:00.000Z',
      nodes: [],
      queues: [],
      sessionCount: 1,
      sessionSummary: {
        total: 1,
        created: 0,
        running: 0,
        checkpointed: 0,
        waitingApproval: 0,
        stopped: 0,
        failed: 0,
        resumable: 1,
      },
      capabilities: {
        generatedAt: '2026-05-16T00:00:00.000Z',
        summary: 'local-only mode',
        machine: {
          os: 'macos',
          cpuCores: 8,
          ramGb: 16,
          gpuAvailable: true,
          topologyType: 'local-only',
          dockerEngine: 'colima',
          maxLocalWorkers: 2,
          cloudRole: 'none',
        },
        capabilities: [],
        detectedEditors: [],
        detectedAgents: [],
      },
      dryRun: false,
    });
    mocks.listSessions.mockResolvedValue([
      {
        sessionId: 'sess-2',
        name: 'runtime-work',
        agentId: 'codex',
        workspace: '/Users/dragon/cboteros/proyectos/intcloudsysops',
        status: 'resumable',
        createdAt: '2026-05-16T00:00:00.000Z',
        lastSeenAt: '2026-05-16T00:00:00.000Z',
        tmuxSessionName: 'tmux-sess-2',
      },
    ]);
    mocks.resumeSession.mockResolvedValue({
      meta: {
        sessionId: 'sess-2',
        name: 'runtime-work',
        agentId: 'codex',
        workspace: '/Users/dragon/cboteros/proyectos/intcloudsysops',
        status: 'running',
        createdAt: '2026-05-16T00:00:00.000Z',
        lastSeenAt: '2026-05-16T00:00:00.000Z',
        tmuxSessionName: 'tmux-sess-2',
      },
      mode: 'reattach',
      output: 'reconnected',
    });

    const ctx = createContext({ message: 'resume tmux session', session_id: 'sess-2' });
    await handleMissionControlChat(ctx);

    expect(ctx.res.statusCode).toBe(200);
    const payload = JSON.parse(ctx.res.body ?? '{}') as { action?: string; summary?: string };
    expect(payload.action).toBe('resume-session');
    expect(payload.summary).toContain('sess-2');
    expect(mocks.resumeSession).toHaveBeenCalledTimes(1);
  });

  it('builds a sequential popping subagent plan for PR analysis', async () => {
    mocks.collectRuntimeHealthSnapshot.mockResolvedValue({
      timestamp: '2026-05-16T00:00:00.000Z',
      nodes: [],
      queues: [],
      sessionCount: 0,
      sessionSummary: {
        total: 0,
        created: 0,
        running: 0,
        checkpointed: 0,
        waitingApproval: 0,
        stopped: 0,
        failed: 0,
        resumable: 0,
      },
      capabilities: {
        generatedAt: '2026-05-16T00:00:00.000Z',
        summary: 'local-only mode',
        machine: {
          os: 'macos',
          cpuCores: 8,
          ramGb: 16,
          gpuAvailable: true,
          topologyType: 'local-only',
          dockerEngine: 'colima',
          maxLocalWorkers: 2,
          cloudRole: 'none',
        },
        capabilities: [],
        detectedEditors: [],
        detectedAgents: [],
      },
      dryRun: false,
    });
    mocks.listSessions.mockResolvedValue([
      {
        sessionId: 'sess-3',
        name: 'pr-review',
        agentId: 'claude',
        branch: 'feature/runtime',
        workspace: '/Users/dragon/cboteros/proyectos/intcloudsysops',
        status: 'running',
        createdAt: '2026-05-16T00:00:00.000Z',
        lastSeenAt: '2026-05-16T00:00:00.000Z',
        tmuxSessionName: 'tmux-sess-3',
      },
    ]);
    mocks.buildPoppingSubagentPlan.mockResolvedValue({
      goal: 'analyze this PR',
      strategy: 'sequential',
      createdAt: '2026-05-16T00:00:00.000Z',
      limits: {
        maxPoppingSubagents: 3,
        maxActivePoppingSubagents: 1,
        defaultTimeoutMinutes: 15,
      },
      activeRoles: [
        {
          id: 'repo-scout',
          role: 'Repository scout',
          skill: 'opsly-context',
          skillChain: ['opsly-context', 'opsly-qa'],
          worker: 'cursor',
          jobType: 'local_cursor',
          maxDurationMinutes: 5,
          riskLevel: 'low',
          requiresApproval: false,
          checkpointRequired: true,
          enabledByDefault: true,
          sequenceOrder: 1,
          rationale: 'Fast repo scan and context collection with existing local editor worker.',
          prompt: 'scan',
          expectedOutput: ['files touched', 'context summary', 'likely hotspots'],
          order: 1,
          workerHealthy: true,
          workerUrl: 'http://cursor:3000',
        },
        {
          id: 'risk-checker',
          role: 'Risk checker',
          skill: 'opsly-architect-senior',
          skillChain: ['opsly-architect-senior', 'opsly-qa'],
          worker: 'claude',
          jobType: 'local_claude',
          maxDurationMinutes: 5,
          riskLevel: 'high',
          requiresApproval: true,
          checkpointRequired: true,
          enabledByDefault: true,
          sequenceOrder: 2,
          rationale:
            'Architecture and impact review should use the review-oriented local Claude worker.',
          prompt: 'risk',
          expectedOutput: ['risk score', 'approval recommendation', 'blocking issues'],
          order: 2,
          workerHealthy: true,
          workerUrl: 'http://claude:3000',
        },
        {
          id: 'pr-summarizer',
          role: 'PR summarizer',
          skill: 'opsly-qa',
          skillChain: ['opsly-qa', 'opsly-context'],
          worker: 'codex',
          jobType: 'local_codex',
          maxDurationMinutes: 3,
          riskLevel: 'low',
          requiresApproval: false,
          checkpointRequired: true,
          enabledByDefault: true,
          sequenceOrder: 3,
          rationale: 'Summaries and next-step extraction fit the local Codex worker.',
          prompt: 'summary',
          expectedOutput: ['summary', 'files touched', 'recommendation'],
          order: 3,
          workerHealthy: true,
          workerUrl: 'http://codex:3000',
        },
      ],
      optionalRoles: [],
      analysis: {
        summary: 'PR analysis ready',
        risk: 'HIGH',
        filesTouched: ['apps/api/app/api/runtime/health/route.ts'],
        recommendation: 'request_changes',
        humanApprovalRequired: true,
      },
      missionControlHint:
        'Sequential popping subagents: repo-scout -> risk-checker -> pr-summarizer',
    });

    const ctx = createContext({ message: 'analyze this PR', session_id: 'sess-3' });
    await handleMissionControlChat(ctx);

    expect(ctx.res.statusCode).toBe(200);
    const payload = JSON.parse(ctx.res.body ?? '{}') as {
      action?: string;
      summary?: string;
      human_approval_required?: boolean;
      popping_subagents?: { activeRoles?: Array<{ id: string }> };
    };
    expect(payload.action).toBe('analyze-pr');
    expect(payload.summary).toContain('PR analysis ready');
    expect(payload.human_approval_required).toBe(true);
    expect(payload.popping_subagents?.activeRoles?.map((role) => role.id)).toEqual([
      'repo-scout',
      'risk-checker',
      'pr-summarizer',
    ]);
    expect(mocks.buildPoppingSubagentPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        goal: 'analyze this PR',
        branchName: 'feature/runtime',
        sessionId: 'sess-3',
      })
    );
  });
});
