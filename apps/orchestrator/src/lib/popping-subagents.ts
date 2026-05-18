import { buildMergeAdvisorReport, getBranchByName } from '@intcloudsysops/git-branch-orchestrator';
import { buildRecoverySnapshot } from '@intcloudsysops/session-manager';
import { getAgentServiceRegistry } from './agent/agent-service-registry.js';

export type PoppingRiskLevel = 'low' | 'medium' | 'high';

export type PoppingSubagentId =
  | 'repo-scout'
  | 'risk-checker'
  | 'pr-summarizer'
  | 'docs-updater'
  | 'branch-cleaner'
  | 'test-runner'
  | 'security-scout'
  | 'cost-checker'
  | 'session-resumer';

export type PoppingSubagentWorker = 'cursor' | 'claude' | 'codex' | 'opencode' | 'copilot';

export interface PoppingSubagentRole {
  id: PoppingSubagentId;
  role: string;
  skill: string;
  skillChain: string[];
  worker: PoppingSubagentWorker;
  jobType: `local_${PoppingSubagentWorker}`;
  maxDurationMinutes: number;
  riskLevel: PoppingRiskLevel;
  requiresApproval: boolean;
  checkpointRequired: boolean;
  enabledByDefault: boolean;
  sequenceOrder: number;
  rationale: string;
}

export interface PoppingSubagentLimits {
  maxPoppingSubagents: number;
  maxActivePoppingSubagents: number;
  defaultTimeoutMinutes: number;
}

export interface PoppingSubagentPlanStage extends PoppingSubagentRole {
  prompt: string;
  expectedOutput: string[];
  order: number;
  workerHealthy: boolean | null;
  workerUrl: string | null;
}

export interface PoppingSubagentAnalysis {
  summary: string;
  risk: 'SAFE' | 'MODERATE' | 'HIGH';
  filesTouched: string[];
  recommendation: string;
  humanApprovalRequired: boolean;
}

export interface PoppingSubagentPlan {
  goal: string;
  strategy: 'sequential';
  createdAt: string;
  limits: PoppingSubagentLimits;
  activeRoles: PoppingSubagentPlanStage[];
  optionalRoles: PoppingSubagentRole[];
  analysis: PoppingSubagentAnalysis;
  missionControlHint: string;
}

export interface PoppingSubagentCatalog {
  limits: PoppingSubagentLimits;
  roles: PoppingSubagentRole[];
  activeDefaultRoles: PoppingSubagentRole[];
  optionalRoles: PoppingSubagentRole[];
}

export interface BuildPoppingSubagentPlanInput {
  goal: string;
  tenantSlug?: string;
  branchName?: string;
  sessionId?: string;
  filesTouched?: string[];
}

const DEFAULT_LIMITS: PoppingSubagentLimits = {
  maxPoppingSubagents: Number(process.env.MAX_POPPING_SUBAGENTS ?? '3'),
  maxActivePoppingSubagents: Number(process.env.MAX_ACTIVE_POPPING_SUBAGENTS ?? '1'),
  defaultTimeoutMinutes: Number(process.env.DEFAULT_TIMEOUT_MINUTES ?? '15'),
};

const ROLE_REGISTRY: Record<PoppingSubagentId, PoppingSubagentRole> = {
  'repo-scout': {
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
  },
  'risk-checker': {
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
    rationale: 'Architecture and impact review should use the review-oriented local Claude worker.',
  },
  'pr-summarizer': {
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
  },
  'docs-updater': {
    id: 'docs-updater',
    role: 'Docs updater',
    skill: 'opsly-bash',
    skillChain: ['opsly-bash', 'opsly-context'],
    worker: 'opencode',
    jobType: 'local_opencode',
    maxDurationMinutes: 5,
    riskLevel: 'low',
    requiresApproval: false,
    checkpointRequired: true,
    enabledByDefault: false,
    sequenceOrder: 4,
    rationale: 'Short documentation edits can use the generic local OpenCode worker.',
  },
  'branch-cleaner': {
    id: 'branch-cleaner',
    role: 'Branch cleaner',
    skill: 'opsly-bash',
    skillChain: ['opsly-bash', 'opsly-architect-senior'],
    worker: 'codex',
    jobType: 'local_codex',
    maxDurationMinutes: 5,
    riskLevel: 'medium',
    requiresApproval: true,
    checkpointRequired: true,
    enabledByDefault: false,
    sequenceOrder: 5,
    rationale: 'Branch hygiene changes should be handled by a short-lived coding worker.',
  },
  'test-runner': {
    id: 'test-runner',
    role: 'Test runner',
    skill: 'opsly-qa',
    skillChain: ['opsly-qa'],
    worker: 'opencode',
    jobType: 'local_opencode',
    maxDurationMinutes: 5,
    riskLevel: 'low',
    requiresApproval: false,
    checkpointRequired: true,
    enabledByDefault: false,
    sequenceOrder: 6,
    rationale: 'Smoke and regression checks can use the generic worker with QA skill.',
  },
  'security-scout': {
    id: 'security-scout',
    role: 'Security scout',
    skill: 'opsly-architect-senior',
    skillChain: ['opsly-architect-senior', 'opsly-qa'],
    worker: 'claude',
    jobType: 'local_claude',
    maxDurationMinutes: 6,
    riskLevel: 'high',
    requiresApproval: true,
    checkpointRequired: true,
    enabledByDefault: false,
    sequenceOrder: 7,
    rationale: 'Security review should remain short-lived and approval gated.',
  },
  'cost-checker': {
    id: 'cost-checker',
    role: 'Cost checker',
    skill: 'opsly-tenant',
    skillChain: ['opsly-tenant', 'opsly-qa'],
    worker: 'codex',
    jobType: 'local_codex',
    maxDurationMinutes: 4,
    riskLevel: 'low',
    requiresApproval: false,
    checkpointRequired: true,
    enabledByDefault: false,
    sequenceOrder: 8,
    rationale: 'Cost awareness is a light tenant/ops task, not a heavy agent.',
  },
  'session-resumer': {
    id: 'session-resumer',
    role: 'Session resumer',
    skill: 'opsly-context',
    skillChain: ['opsly-context', 'opsly-orchestrator'],
    worker: 'cursor',
    jobType: 'local_cursor',
    maxDurationMinutes: 4,
    riskLevel: 'medium',
    requiresApproval: false,
    checkpointRequired: true,
    enabledByDefault: false,
    sequenceOrder: 9,
    rationale: 'Recovery and continuation are best handled by the existing session runtime.',
  },
};

function activeRoleIdsForGoal(goal: string): PoppingSubagentId[] {
  const lower = goal.toLowerCase();
  if (/(analy[sz]e|review).*(pr|pull request)/.test(lower) || /analyze this pr/.test(lower)) {
    return ['repo-scout', 'risk-checker', 'pr-summarizer'];
  }
  if (/(session|resume|recovery)/.test(lower)) {
    return ['repo-scout', 'session-resumer', 'pr-summarizer'];
  }
  return ['repo-scout', 'risk-checker', 'pr-summarizer'];
}

async function workerHealth(worker: PoppingSubagentWorker): Promise<{ healthy: boolean | null; url: string | null }> {
  const registry = getAgentServiceRegistry();
  try {
    const service = await registry.getWorkingService(worker);
    if (!service) {
      return { healthy: null, url: null };
    }
    return {
      healthy: true,
      url: service.service.url,
    };
  } catch {
    return { healthy: null, url: null };
  }
}

function buildPromptForRole(role: PoppingSubagentRole, goal: string, context: BuildPoppingSubagentPlanInput): string {
  const lines = [
    `Goal: ${goal}`,
    `Role: ${role.role}`,
    `Skill: ${role.skill}`,
    `Worker: ${role.jobType}`,
    `Rules: short-lived, checkpoint, stop`,
  ];
  if (context.branchName) lines.push(`Branch: ${context.branchName}`);
  if (context.sessionId) lines.push(`Session: ${context.sessionId}`);
  if (context.tenantSlug) lines.push(`Tenant: ${context.tenantSlug}`);
  if (context.filesTouched && context.filesTouched.length > 0) {
    lines.push(`Files: ${context.filesTouched.join(', ')}`);
  }
  return lines.join('\n');
}

async function buildAnalysis(input: BuildPoppingSubagentPlanInput): Promise<PoppingSubagentAnalysis> {
  if (input.branchName) {
    const entry = await getBranchByName(input.tenantSlug ?? 'intcloudsysops', input.branchName).catch(() => null);
    if (entry) {
      try {
        const advisor = await buildMergeAdvisorReport(entry);
        return {
          summary: advisor.summary,
          risk: advisor.risk_level,
          filesTouched: advisor.files_changed,
          recommendation: advisor.recommended_action,
          humanApprovalRequired: advisor.requires_human_approval,
        };
      } catch {
        return {
          summary: `Branch ${input.branchName} found but merge advisor was unavailable.`,
          risk: 'MODERATE',
          filesTouched: entry.files_touched ?? input.filesTouched ?? [],
          recommendation: 'review',
          humanApprovalRequired: true,
        };
      }
    }
    return {
      summary: `No registry entry found for ${input.branchName}.`,
      risk: 'MODERATE',
      filesTouched: input.filesTouched ?? [],
      recommendation: 'request_changes',
      humanApprovalRequired: true,
    };
  }

  if (input.sessionId) {
    const recovery = await buildRecoverySnapshot(input.sessionId, input.tenantSlug).catch(() => null);
    if (recovery) {
      const files = recovery.changedFiles ?? [];
      const highRisk = files.some((file) => file.includes('apps/api') || file.includes('infra/'));
      return {
        summary: `Recovery snapshot for session ${input.sessionId} recommends ${recovery.recommendedAction}.`,
        risk: highRisk ? 'HIGH' : 'MODERATE',
        filesTouched: files,
        recommendation: recovery.recommendedActions[0] ?? 'review',
        humanApprovalRequired: highRisk,
      };
    }
  }

  return {
    summary: 'Lightweight popping subagent analysis based on plan context only.',
    risk: 'MODERATE',
    filesTouched: input.filesTouched ?? [],
    recommendation: 'review',
    humanApprovalRequired: false,
  };
}

export function getPoppingSubagentCatalog(): PoppingSubagentCatalog {
  const roles = Object.values(ROLE_REGISTRY).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  return {
    limits: DEFAULT_LIMITS,
    roles,
    activeDefaultRoles: roles.filter((role) => role.enabledByDefault),
    optionalRoles: roles.filter((role) => !role.enabledByDefault),
  };
}

export async function buildPoppingSubagentPlan(
  input: BuildPoppingSubagentPlanInput
): Promise<PoppingSubagentPlan> {
  const catalog = getPoppingSubagentCatalog();
  const goal = input.goal.trim();
  const roleIds = activeRoleIdsForGoal(goal);
  const activeRoles: PoppingSubagentPlanStage[] = [];
  const registry = getAgentServiceRegistry();

  await registry.getConfig().catch(() => null);

  for (const roleId of roleIds.slice(0, catalog.limits.maxPoppingSubagents)) {
    const role = ROLE_REGISTRY[roleId];
    const health = await workerHealth(role.worker);
    activeRoles.push({
      ...role,
      prompt: buildPromptForRole(role, goal, input),
      expectedOutput:
        role.id === 'repo-scout'
          ? ['files touched', 'context summary', 'likely hotspots']
          : role.id === 'risk-checker'
            ? ['risk score', 'approval recommendation', 'blocking issues']
            : ['summary', 'files touched', 'recommendation'],
      order: role.sequenceOrder,
      workerHealthy: health.healthy,
      workerUrl: health.url,
    });
  }

  const analysis = await buildAnalysis(input);
  const humanApprovalRequired =
    analysis.humanApprovalRequired || activeRoles.some((role) => role.requiresApproval);

  return {
    goal,
    strategy: 'sequential',
    createdAt: new Date().toISOString(),
    limits: catalog.limits,
    activeRoles,
    optionalRoles: catalog.optionalRoles,
    analysis: {
      ...analysis,
      humanApprovalRequired,
    },
    missionControlHint:
      roleIds.length > 0
        ? `Sequential popping subagents: ${roleIds.join(' -> ')}`
        : 'No subagents selected',
  };
}
