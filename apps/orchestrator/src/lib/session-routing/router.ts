import { listBranchEntries, resolveRepoRoot } from '@intcloudsysops/git-branch-orchestrator';
import { listSessions } from '@intcloudsysops/session-manager';

export type SessionRouteAction =
  | 'continue'
  | 'resume'
  | 'recover'
  | 'review'
  | 'merge'
  | 'archive';

export interface SessionProposal {
  kind: 'session' | 'branch';
  sessionId?: string;
  branchId?: string;
  label: string;
  status: string;
  branch?: string;
  agentId?: string;
  risk: 'low' | 'medium' | 'high';
  score: number;
  tmuxAlive?: boolean;
  actions: SessionRouteAction[];
}

export interface SessionRouteRequest {
  message: string;
  tenantSlug?: string;
  workspace?: string;
  branch?: string;
}

export interface SessionRouteResult {
  summary: string;
  proposals: SessionProposal[];
  message: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9/_-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function hoursSince(iso: string): number {
  const ms = Date.now() - Date.parse(iso);
  return Number.isFinite(ms) ? ms / (1000 * 60 * 60) : 999;
}

function scoreSession(
  messageTokens: string[],
  session: Awaited<ReturnType<typeof listSessions>>[number],
  tmuxAlive: boolean,
): { score: number; actions: SessionRouteAction[] } {
  let score = 0;
  const hay = [
    session.name,
    session.agentId,
    session.branch ?? '',
    session.jobId ?? '',
    session.status,
  ]
    .join(' ')
    .toLowerCase();

  for (const token of messageTokens) {
    if (hay.includes(token)) {
      score += 12;
    }
  }

  const ageH = hoursSince(session.lastSeenAt);
  if (ageH < 6) {
    score += 20;
  } else if (ageH < 48) {
    score += 8;
  } else {
    score -= 10;
  }

  if (tmuxAlive) {
    score += 25;
  }

  if (session.status === 'running' || session.status === 'checkpointed') {
    score += 15;
  }
  if (session.status === 'waiting_approval') {
    score += 10;
  }
  if (session.status === 'stopped') {
    score -= 5;
  }

  const actions: SessionRouteAction[] = [];
  if (tmuxAlive) {
    actions.push('continue', 'resume');
  } else {
    actions.push('recover', 'resume');
  }
  if (session.status === 'waiting_approval' || session.lastCheckpoint) {
    actions.push('review');
  }
  if (session.branch?.includes('agent/')) {
    actions.push('merge');
  }
  if (session.status === 'stopped' && ageH > 72) {
    actions.push('archive');
  }

  return { score, actions: [...new Set(actions)] };
}

function scoreBranch(
  messageTokens: string[],
  entry: Awaited<ReturnType<typeof listBranchEntries>>[number],
): { score: number; actions: SessionRouteAction[] } {
  let score = 0;
  const hay = [
    entry.branch_name,
    entry.title ?? '',
    entry.task_slug,
    entry.worker_id,
    entry.status,
    entry.initiative,
  ]
    .join(' ')
    .toLowerCase();

  for (const token of messageTokens) {
    if (hay.includes(token)) {
      score += 14;
    }
  }

  const ageH = hoursSince(entry.updated_at);
  if (ageH < 24) {
    score += 12;
  }

  if (entry.status === 'active' || entry.status === 'pr_open') {
    score += 18;
  }
  if (entry.status === 'stale') {
    score -= 15;
  }

  const actions: SessionRouteAction[] = ['review'];
  if (entry.status === 'active') {
    actions.push('continue', 'resume');
  }
  if (entry.status === 'pr_open') {
    actions.push('merge', 'review');
  }
  if (entry.status === 'stale' || entry.status === 'closed') {
    actions.push('archive');
  }

  return { score, actions: [...new Set(actions)] };
}

function formatOperatorMessage(proposals: SessionProposal[]): string {
  if (proposals.length === 0) {
    return 'No matching sessions or branches. Try naming a branch, agent, or goal.';
  }

  const lines = proposals.slice(0, 6).map((p, idx) => {
    const letter = String.fromCharCode(65 + idx);
    const branchLine = p.branch ? `\nBranch: ${p.branch}` : '';
    const statusLine = `Status: ${p.status}`;
    const riskLine = `Risk: ${p.risk.toUpperCase()}`;
    const actionLine = `Choose: ${p.actions.join(' / ')}`;
    return `[${letter}] ${p.label}\n${statusLine}${branchLine}\n${riskLine}\n${actionLine}`;
  });

  return `${proposals.length} candidate(s) found.\n\n${lines.join('\n\n')}`;
}

export async function routeSessions(input: SessionRouteRequest): Promise<SessionRouteResult> {
  const tenantSlug = input.tenantSlug?.trim() || 'intcloudsysops';
  const messageTokens = tokenize(input.message);
  const root = resolveRepoRoot();

  const [sessions, branches] = await Promise.all([
    listSessions(),
    listBranchEntries(tenantSlug, root),
  ]);

  const sessionProposals: SessionProposal[] = sessions.map((session) => {
    const tmuxAlive = session.status === 'running';
    const { score, actions } = scoreSession(messageTokens, session, tmuxAlive);
    return {
      kind: 'session',
      sessionId: session.sessionId,
      label: `${session.agentId} — ${session.name}`,
      status: session.status,
      branch: session.branch,
      agentId: session.agentId,
      risk: session.branch?.includes('main') ? 'high' : 'medium',
      score,
      tmuxAlive,
      actions,
    };
  });

  const branchProposals: SessionProposal[] = branches.map((entry) => {
    const { score, actions } = scoreBranch(messageTokens, entry);
    return {
      kind: 'branch',
      branchId: entry.id,
      sessionId: entry.session_id,
      label: entry.title ?? entry.task_slug,
      status: entry.status,
      branch: entry.branch_name,
      agentId: entry.worker_id,
      risk: entry.risk_level,
      score,
      actions,
    };
  });

  const proposals = [...sessionProposals, ...branchProposals]
    .filter((p) => {
      if (input.workspace && p.kind === 'session') {
        return true;
      }
      if (input.branch && p.branch && !p.branch.includes(input.branch)) {
        return false;
      }
      return p.score > 0 || messageTokens.length === 0;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const visible = proposals.length > 0 ? proposals : [...sessionProposals, ...branchProposals]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const summary =
    visible.length === 0
      ? 'No sessions or branches in registry.'
      : `${visible.length} ranked candidate(s) for: "${input.message.slice(0, 120)}"`;

  return {
    summary,
    proposals: visible,
    message: formatOperatorMessage(visible),
  };
}
