import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { execa } from 'execa';
import { listBranchEntries, resolveRepoRoot } from '@intcloudsysops/git-branch-orchestrator';

import { appendSessionLog, loadSession, resolveStateDir } from './store.js';
import { isDryRun, tmuxHasSession } from './tmux.js';
import type { RuntimeSessionMetadata } from './types.js';

export type RecoveryAction = 'resume' | 'recover' | 'review' | 'archive' | 'continue' | 'merge';

export interface RecoverySnapshot {
  sessionId: string;
  capturedAt: string;
  workspace: string;
  branch?: string;
  agentId: string;
  jobId?: string;
  tmuxAlive: boolean;
  gitStatus?: string;
  gitDiffStat?: string;
  changedFiles: string[];
  branchRegistryMatches: Array<{
    id: string;
    branch_name: string;
    status: string;
    risk_level: string;
    job_id: string;
  }>;
  sessionMeta: RuntimeSessionMetadata;
  logsTail?: string;
  recommendedAction: RecoveryAction;
  recommendedActions: RecoveryAction[];
}

async function readLogsTail(sessionId: string, maxLines = 40): Promise<string | undefined> {
  const logPath = path.join(resolveStateDir(), 'logs', `${sessionId}.log`);
  try {
    const raw = await readFile(logPath, 'utf8');
    const lines = raw.trim().split('\n');
    return lines.slice(-maxLines).join('\n');
  } catch {
    return undefined;
  }
}

async function gitSnapshot(
  workspace: string,
): Promise<{ status?: string; diffStat?: string; changedFiles: string[] }> {
  if (isDryRun()) {
    return {
      status: '[dry-run] git status',
      diffStat: '[dry-run] git diff --stat',
      changedFiles: [],
    };
  }
  try {
    const [status, diffStat, nameOnly] = await Promise.all([
      execa('git', ['status', '--short'], { cwd: workspace, reject: false }),
      execa('git', ['diff', '--stat'], { cwd: workspace, reject: false }),
      execa('git', ['diff', '--name-only'], { cwd: workspace, reject: false }),
    ]);
    const changedFiles = nameOnly.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return {
      status: status.stdout.trim() || status.stderr.trim() || undefined,
      diffStat: diffStat.stdout.trim() || undefined,
      changedFiles,
    };
  } catch {
    return { changedFiles: [] };
  }
}

function recommendActions(
  meta: RuntimeSessionMetadata,
  tmuxAlive: boolean,
  changedFiles: string[],
): RecoveryAction[] {
  const actions: RecoveryAction[] = [];
  if (tmuxAlive) {
    actions.push('continue', 'resume');
  } else if (meta.status === 'stopped' || meta.status === 'failed') {
    actions.push('recover', 'review', 'archive');
  } else {
    actions.push('recover', 'resume', 'review');
  }
  if (changedFiles.length > 0) {
    actions.push('review', 'merge');
  }
  if (meta.status === 'waiting_approval') {
    actions.unshift('review');
  }
  return [...new Set(actions)];
}

export async function buildRecoverySnapshot(
  sessionId: string,
  tenantSlug = 'intcloudsysops',
): Promise<RecoverySnapshot> {
  const meta = await loadSession(sessionId);
  if (!meta) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const tmuxAlive = await tmuxHasSession(meta.tmuxSessionName);
  const git = await gitSnapshot(meta.workspace);
  const logsTail = await readLogsTail(sessionId);

  const root = resolveRepoRoot();
  const entries = await listBranchEntries(tenantSlug, root);
  const branchRegistryMatches = entries
    .filter(
      (e) =>
        e.session_id === sessionId ||
        (meta.branch && e.branch_name === meta.branch) ||
        (meta.jobId && e.job_id === meta.jobId),
    )
    .slice(0, 8)
    .map((e) => ({
      id: e.id,
      branch_name: e.branch_name,
      status: e.status,
      risk_level: e.risk_level,
      job_id: e.job_id,
    }));

  const recommendedActions = recommendActions(meta, tmuxAlive, git.changedFiles);
  const recommendedAction = recommendedActions[0] ?? 'review';

  const snapshot: RecoverySnapshot = {
    sessionId,
    capturedAt: new Date().toISOString(),
    workspace: meta.workspace,
    branch: meta.branch,
    agentId: meta.agentId,
    jobId: meta.jobId,
    tmuxAlive,
    gitStatus: git.status,
    gitDiffStat: git.diffStat,
    changedFiles: git.changedFiles,
    branchRegistryMatches,
    sessionMeta: meta,
    logsTail,
    recommendedAction,
    recommendedActions,
  };

  await appendSessionLog(sessionId, `recovery snapshot tmux=${tmuxAlive} files=${git.changedFiles.length}`);
  return snapshot;
}
