import type { RuntimeSessionMetadata } from '@intcloudsysops/session-manager';
import {
  buildRecoverySnapshot,
  checkpointSession,
  listSessions,
  resumeSession,
  stopSession,
} from '@intcloudsysops/session-manager';
import { buildBranchHygieneReport } from '@intcloudsysops/git-branch-orchestrator';
import { buildPoppingSubagentPlan, type PoppingSubagentPlan } from '../../lib/popping-subagents.js';

import type { RouteContext } from '../router.js';
import { errorResponse, jsonResponse } from '../router.js';
import { parseBody, verifyPlatformAdminToken } from '../utils.js';
import { collectRuntimeHealthSnapshot } from '../../runtime/runtime-health.js';

type MissionControlChatRequest = {
  message?: string;
  session_id?: string;
  tenant_slug?: string;
  initiative?: string;
  workspace?: string;
};

type WorkerRecommendation = {
  workerId: string;
  opslyJobType: string;
  rationale: string;
};

type MissionControlChatResponse = {
  ok: true;
  action: string;
  summary: string;
  reply: string;
  worker_recommendation?: WorkerRecommendation;
  human_approval_required: boolean;
  session?: {
    sessionId: string;
    name: string;
    agentId: string;
    status: string;
    branch?: string;
    workspace: string;
    lastSeenAt: string;
  } | null;
  recovery?: Awaited<ReturnType<typeof buildRecoverySnapshot>>;
  branch_map?: {
    scanned: number;
    issues: number;
    recommendations: string[];
  };
  popping_subagents?: PoppingSubagentPlan;
  capabilities?: Awaited<ReturnType<typeof collectRuntimeHealthSnapshot>>['capabilities'];
  session_summary?: Awaited<ReturnType<typeof collectRuntimeHealthSnapshot>>['sessionSummary'];
};

const WORKER_BY_AGENT: Record<string, WorkerRecommendation> = {
  cursor: {
    workerId: 'cursor',
    opslyJobType: 'local_cursor',
    rationale: 'Cursor is best for IDE-anchored implementation work.',
  },
  'cursor-ide': {
    workerId: 'cursor',
    opslyJobType: 'local_cursor',
    rationale: 'Cursor is best for IDE-anchored implementation work.',
  },
  claude: {
    workerId: 'claude',
    opslyJobType: 'local_claude',
    rationale: 'Claude is best for architecture and review-heavy work.',
  },
  'claude-code': {
    workerId: 'claude',
    opslyJobType: 'local_claude',
    rationale: 'Claude is best for architecture and review-heavy work.',
  },
  codex: {
    workerId: 'codex',
    opslyJobType: 'local_codex',
    rationale: 'Codex is best for local execution and repo edits.',
  },
  'codex-cli': {
    workerId: 'codex',
    opslyJobType: 'local_codex',
    rationale: 'Codex is best for local execution and repo edits.',
  },
  opencode: {
    workerId: 'opencode',
    opslyJobType: 'local_opencode',
    rationale: 'OpenCode is the default local execution worker.',
  },
  copilot: {
    workerId: 'copilot',
    opslyJobType: 'local_copilot',
    rationale: 'Copilot is useful for UI/IDE-assisted tasks.',
  },
};

function requireAdmin(ctx: RouteContext): boolean {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return false;
  }
  return true;
}

function parseChatIntent(message: string): {
  action:
    | 'continue'
    | 'resume'
    | 'checkpoint'
    | 'stop'
    | 'stale'
    | 'branches'
    | 'capabilities'
    | 'analyze-pr'
    | 'generic';
  humanApprovalRequired: boolean;
} {
  const lower = message.toLowerCase();
  if (/(analy[sz]e|review).*(pr|pull request)/.test(lower) || /analyze this pr/.test(lower)) {
    return { action: 'analyze-pr', humanApprovalRequired: true };
  }
  if (/(checkpoint|snapshot)/.test(lower)) {
    return { action: 'checkpoint', humanApprovalRequired: false };
  }
  if (/(resume|reattach)/.test(lower)) {
    return { action: 'resume', humanApprovalRequired: false };
  }
  if (/(stop|archive)/.test(lower)) {
    return { action: 'stop', humanApprovalRequired: true };
  }
  if (/(stale|resumable|unfinished)/.test(lower)) {
    return { action: 'stale', humanApprovalRequired: false };
  }
  if (/(branch|governance|workstream|branch map)/.test(lower)) {
    return { action: 'branches', humanApprovalRequired: false };
  }
  if (/(capabilit|local-first|topology|recommend)/.test(lower)) {
    return { action: 'capabilities', humanApprovalRequired: false };
  }
  if (/(continue runtime work|continue|carry on|keep going)/.test(lower)) {
    return { action: 'continue', humanApprovalRequired: false };
  }
  return { action: 'generic', humanApprovalRequired: false };
}

function pickLatestSession(sessions: RuntimeSessionMetadata[]): RuntimeSessionMetadata | null {
  if (sessions.length === 0) {
    return null;
  }
  return [...sessions].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))[0] ?? null;
}

function compactSession(
  session: RuntimeSessionMetadata
): NonNullable<MissionControlChatResponse['session']> {
  return {
    sessionId: session.sessionId,
    name: session.name,
    agentId: session.agentId,
    status: session.status,
    branch: session.branch,
    workspace: session.workspace,
    lastSeenAt: session.lastSeenAt,
  };
}

function recommendationForSession(session: RuntimeSessionMetadata | null): WorkerRecommendation {
  if (!session) {
    return {
      workerId: 'opencode',
      opslyJobType: 'local_opencode',
      rationale: 'No live session found; OpenCode is the default local execution worker.',
    };
  }

  const key = session.agentId.trim().toLowerCase();
  if (WORKER_BY_AGENT[key]) {
    return WORKER_BY_AGENT[key];
  }
  if (key.includes('claude')) return WORKER_BY_AGENT.claude;
  if (key.includes('codex')) return WORKER_BY_AGENT.codex;
  if (key.includes('cursor')) return WORKER_BY_AGENT.cursor;
  if (key.includes('copilot')) return WORKER_BY_AGENT.copilot;
  return {
    workerId: session.agentId,
    opslyJobType: 'local_opencode',
    rationale: `Use the existing ${session.agentId} session as the least disruptive continuation path.`,
  };
}

function summarizeStaleSessions(sessions: RuntimeSessionMetadata[]): RuntimeSessionMetadata[] {
  return sessions.filter(
    (session) => session.status === 'resumable' || session.status === 'stopped'
  );
}
export async function handleMissionControlChat(ctx: RouteContext): Promise<void> {
  if (!requireAdmin(ctx)) {
    return;
  }

  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch {
    errorResponse(ctx.res, 400, 'Invalid JSON');
    return;
  }

  if (typeof body !== 'object' || body === null) {
    errorResponse(ctx.res, 400, 'invalid body');
    return;
  }

  const request = body as MissionControlChatRequest;
  const message = typeof request.message === 'string' ? request.message.trim() : '';
  if (message.length === 0) {
    errorResponse(ctx.res, 400, 'message required');
    return;
  }

  const tenantSlug =
    typeof request.tenant_slug === 'string' && request.tenant_slug.trim().length > 0
      ? request.tenant_slug.trim()
      : process.env.OPSLY_DEFAULT_TENANT_SLUG?.trim() || 'intcloudsysops';

  const intent = parseChatIntent(message);
  const snapshot = await collectRuntimeHealthSnapshot();
  const sessions = await listSessions().catch(() => []);
  const requestedSessionId =
    typeof request.session_id === 'string' && request.session_id.trim().length > 0
      ? request.session_id.trim()
      : null;
  const requestedSession = requestedSessionId
    ? sessions.find((session) => session.sessionId === requestedSessionId)
    : null;
  if (requestedSessionId && !requestedSession) {
    errorResponse(ctx.res, 404, `session not found: ${requestedSessionId}`);
    return;
  }
  const selectedSession = requestedSession ?? pickLatestSession(sessions);
  const staleSessions = summarizeStaleSessions(sessions);
  const workerRecommendation = recommendationForSession(selectedSession);

  if (
    (intent.action === 'resume' || intent.action === 'checkpoint' || intent.action === 'stop') &&
    !selectedSession
  ) {
    jsonResponse(ctx.res, 200, {
      ok: true,
      action: 'missing-session',
      summary: 'No session_id supplied and no recent session found.',
      reply: 'Provide session_id to resume, checkpoint, or stop a tmux-backed session.',
      worker_recommendation: workerRecommendation,
      human_approval_required: intent.humanApprovalRequired,
      capabilities: snapshot.capabilities,
      session_summary: snapshot.sessionSummary,
    } satisfies MissionControlChatResponse);
    return;
  }

  if (intent.action === 'resume' && selectedSession) {
    const result = await resumeSession({
      sessionId: selectedSession.sessionId,
    });
    jsonResponse(ctx.res, 200, {
      ok: true,
      action: 'resume-session',
      summary: `Resumed session ${result.meta.sessionId} in ${result.mode} mode.`,
      reply:
        result.output ??
        `Session ${result.meta.sessionId} resumed. Continue from the existing tmux pane.`,
      worker_recommendation: recommendationForSession(result.meta),
      human_approval_required: false,
      session: compactSession(result.meta),
      recovery: result.recovery,
      capabilities: snapshot.capabilities,
      session_summary: snapshot.sessionSummary,
    } satisfies MissionControlChatResponse);
    return;
  }

  if (intent.action === 'checkpoint' && selectedSession) {
    const result = await checkpointSession(selectedSession.sessionId, message);
    jsonResponse(ctx.res, 200, {
      ok: true,
      action: 'checkpoint-session',
      summary: `Checkpointed session ${result.sessionId}.`,
      reply: `Saved checkpoint for ${selectedSession.name} and kept the runtime state recoverable.`,
      worker_recommendation: recommendationForSession(result),
      human_approval_required: false,
      session: compactSession(result),
      capabilities: snapshot.capabilities,
      session_summary: snapshot.sessionSummary,
    } satisfies MissionControlChatResponse);
    return;
  }

  if (intent.action === 'stop' && selectedSession) {
    const result = await stopSession(selectedSession.sessionId);
    jsonResponse(ctx.res, 200, {
      ok: true,
      action: 'stop-session',
      summary: `Stopped session ${result.sessionId}.`,
      reply: `Session ${selectedSession.name} stopped. It is now available for recovery or archive.`,
      worker_recommendation: recommendationForSession(result),
      human_approval_required: true,
      session: compactSession(result),
      capabilities: snapshot.capabilities,
      session_summary: snapshot.sessionSummary,
    } satisfies MissionControlChatResponse);
    return;
  }

  if (intent.action === 'stale') {
    const branchReport = await buildBranchHygieneReport({
      tenant_slug: tenantSlug,
      initiative: typeof request.initiative === 'string' ? request.initiative : undefined,
    });
    jsonResponse(ctx.res, 200, {
      ok: true,
      action: 'show-stale-sessions',
      summary: `${staleSessions.length} resumable or stopped sessions found.`,
      reply:
        staleSessions.length > 0
          ? staleSessions
              .map((session) => `${session.sessionId} · ${session.name} · ${session.status}`)
              .join('\n')
          : 'No stale sessions detected. New work can start from a clean session.',
      worker_recommendation: workerRecommendation,
      human_approval_required: branchReport.issues.some((issue) => issue.severity === 'error'),
      branch_map: {
        scanned: branchReport.scanned,
        issues: branchReport.issues.length,
        recommendations: branchReport.recommendations,
      },
      capabilities: snapshot.capabilities,
      session_summary: snapshot.sessionSummary,
    } satisfies MissionControlChatResponse);
    return;
  }

  if (intent.action === 'branches') {
    const branchReport = await buildBranchHygieneReport({
      tenant_slug: tenantSlug,
      initiative: typeof request.initiative === 'string' ? request.initiative : undefined,
    });
    jsonResponse(ctx.res, 200, {
      ok: true,
      action: 'branch-governance',
      summary: `Branch registry scanned: ${branchReport.scanned} entries.`,
      reply:
        branchReport.recommendations.length > 0
          ? branchReport.recommendations.join('\n')
          : 'No branch hygiene issues detected in the current scope.',
      worker_recommendation: workerRecommendation,
      human_approval_required: branchReport.issues.some((issue) => issue.severity === 'error'),
      branch_map: {
        scanned: branchReport.scanned,
        issues: branchReport.issues.length,
        recommendations: branchReport.recommendations,
      },
      capabilities: snapshot.capabilities,
      session_summary: snapshot.sessionSummary,
    } satisfies MissionControlChatResponse);
    return;
  }

  if (intent.action === 'capabilities') {
    const capabilitySummary = snapshot.capabilities.summary;
    jsonResponse(ctx.res, 200, {
      ok: true,
      action: 'runtime-capabilities',
      summary: capabilitySummary,
      reply: [
        `Machine: ${snapshot.capabilities.machine.os}, ${snapshot.capabilities.machine.cpuCores} cores, ${snapshot.capabilities.machine.ramGb} GB RAM.`,
        `Recommended mode: ${snapshot.capabilities.machine.topologyType} with ${snapshot.capabilities.machine.maxLocalWorkers} local worker(s).`,
        `Detected editors: ${snapshot.capabilities.detectedEditors.join(', ') || 'none'}.`,
        `Detected agent tools: ${snapshot.capabilities.detectedAgents.join(', ') || 'none'}.`,
      ].join('\n'),
      worker_recommendation: workerRecommendation,
      human_approval_required: false,
      capabilities: snapshot.capabilities,
      session_summary: snapshot.sessionSummary,
    } satisfies MissionControlChatResponse);
    return;
  }

  if (intent.action === 'analyze-pr') {
    const plan = await buildPoppingSubagentPlan({
      goal: message,
      tenantSlug,
      branchName: selectedSession?.branch ?? undefined,
      sessionId: selectedSession?.sessionId ?? undefined,
    });
    const primaryRole = plan.activeRoles[0];
    jsonResponse(ctx.res, 200, {
      ok: true,
      action: 'analyze-pr',
      summary: `${plan.analysis.summary} (${plan.activeRoles.length} popping subagent(s), ${plan.analysis.risk} risk).`,
      reply: [
        `Summary: ${plan.analysis.summary}`,
        `Risk: ${plan.analysis.risk}`,
        `Files touched: ${plan.analysis.filesTouched.length > 0 ? plan.analysis.filesTouched.join(', ') : 'unknown'}`,
        `Recommendation: ${plan.analysis.recommendation}`,
        `Human approval required: ${plan.analysis.humanApprovalRequired ? 'yes' : 'no'}`,
        `Subagents: ${plan.activeRoles.map((role) => role.id).join(' -> ')}`,
      ].join('\n'),
      worker_recommendation: primaryRole
        ? {
            workerId: primaryRole.worker,
            opslyJobType: primaryRole.jobType,
            rationale: primaryRole.rationale,
          }
        : workerRecommendation,
      human_approval_required: plan.analysis.humanApprovalRequired,
      session: selectedSession ? compactSession(selectedSession) : null,
      capabilities: snapshot.capabilities,
      session_summary: snapshot.sessionSummary,
      popping_subagents: plan,
    } satisfies MissionControlChatResponse);
    return;
  }

  const recovery = selectedSession
    ? await buildRecoverySnapshot(selectedSession.sessionId, tenantSlug)
    : null;
  const replyLines: string[] = [];

  if (selectedSession) {
    replyLines.push(
      `Session ${selectedSession.sessionId} (${selectedSession.name}) is ${selectedSession.status} on ${selectedSession.branch ?? 'no branch'}.`
    );
    if (recovery) {
      replyLines.push(`Recommended next action: ${recovery.recommendedAction}.`);
      if (recovery.branchRegistryMatches.length > 0) {
        replyLines.push(
          `Branch registry matches: ${recovery.branchRegistryMatches.map((entry) => entry.branch_name).join(', ')}.`
        );
      }
    }
  } else {
    replyLines.push('No active session found. Create one or resume a stale session first.');
  }

  replyLines.push(`Runtime mode: ${snapshot.capabilities.machine.topologyType}.`);
  replyLines.push(`Local worker budget: ${snapshot.capabilities.machine.maxLocalWorkers}.`);

  jsonResponse(ctx.res, 200, {
    ok: true,
    action: 'continue-runtime-work',
    summary: `${snapshot.sessionSummary.resumable} resumable session(s), ${snapshot.sessionSummary.running} running session(s).`,
    reply: replyLines.join('\n'),
    worker_recommendation: workerRecommendation,
    human_approval_required: intent.humanApprovalRequired,
    session: selectedSession ? compactSession(selectedSession) : null,
    recovery: recovery ?? undefined,
    branch_map: recovery
      ? {
          scanned: recovery.branchRegistryMatches.length,
          issues: recovery.changedFiles.length,
          recommendations: recovery.recommendedActions.map((action) => action),
        }
      : undefined,
    capabilities: snapshot.capabilities,
    session_summary: snapshot.sessionSummary,
  } satisfies MissionControlChatResponse);
}
