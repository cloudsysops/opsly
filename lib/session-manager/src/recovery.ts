import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { listBranchEntries, resolveRepoRoot } from '@intcloudsysops/git-branch-orchestrator';

import { redactSecrets } from './redact.js';
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
    return redactSecrets(lines.slice(-maxLines).join('\n'));
  } catch {
    return undefined;
  }
}

const execFileAsync = promisify(execFile);

async function runGit(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, { cwd });
    return { stdout, stderr };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

export function parsePorcelainZ(stdout: string): string[] {
  const entries = stdout.split('\0').filter((e) => e.length > 0);
  const files: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const code = entry.slice(0, 2);
    files.push(entry.slice(3));
    // Renames/copies are followed by an extra NUL-separated "original path" entry.
    if (code.includes('R') || code.includes('C')) {
      i++;
    }
  }
  return files;
}

export async function gitCheckpointState(
  workspace: string,
): Promise<{ gitSha?: string; gitBranch?: string; dirtyFiles: string[] }> {
  if (isDryRun()) {
    return { dirtyFiles: [] };
  }
  const [sha, branch, porcelain] = await Promise.all([
    runGit(['rev-parse', 'HEAD'], workspace),
    runGit(['rev-parse', '--abbrev-ref', 'HEAD'], workspace),
    runGit(['status', '--porcelain', '-z', '--untracked-files=all'], workspace),
  ]);
  return {
    gitSha: sha.stdout.trim() || undefined,
    gitBranch: branch.stdout.trim() || undefined,
    dirtyFiles: parsePorcelainZ(porcelain.stdout),
  };
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
    const [status, diffStat, porcelain] = await Promise.all([
      runGit(['status', '--short'], workspace),
      runGit(['diff', '--stat'], workspace),
      runGit(['status', '--porcelain', '-z', '--untracked-files=all'], workspace),
    ]);
    // porcelain includes staged and untracked files, which `git diff --name-only` misses.
    const changedFiles = parsePorcelainZ(porcelain.stdout);
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

function resolveTenantSlug(explicit?: string): string {
  const fromArg = explicit?.trim();
  if (fromArg && fromArg.length > 0) {
    return fromArg;
  }
  const fromEnv = process.env.OPSLY_DEFAULT_TENANT_SLUG?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  return 'intcloudsysops';
}

export async function buildRecoverySnapshot(
  sessionId: string,
  tenantSlug?: string,
): Promise<RecoverySnapshot> {
  const meta = await loadSession(sessionId);
  if (!meta) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const resolvedTenant = resolveTenantSlug(tenantSlug);
  const tmuxAlive = await tmuxHasSession(meta.tmuxSessionName);
  const git = await gitSnapshot(meta.workspace);
  const logsTail = await readLogsTail(sessionId);

  const root = resolveRepoRoot();
  const entries = await listBranchEntries(resolvedTenant, root);
  const branchRegistryMatches = entries
    .filter(
      (e: Record<string, unknown>) =>
        e.session_id === sessionId ||
        (meta.branch && e.branch_name === meta.branch) ||
        (meta.jobId && e.job_id === meta.jobId),
    )
    .slice(0, 8)
    .map((e: Record<string, unknown>) => ({
      id: String(e.id),
      branch_name: String(e.branch_name),
      status: String(e.status),
      risk_level: String(e.risk_level),
      job_id: String(e.job_id),
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
