#!/usr/bin/env tsx
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, open, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  classifyBranchCleanup,
  type BranchCleanupDecision,
} from '../../lib/git-branch-orchestrator/src/cleanup.js';

const execFileAsync = promisify(execFile);

type RegistryEntry = {
  id: string;
  tenant_slug: string;
  branch_name: string;
  job_id: string;
  worker_id: string;
  session_id?: string;
  pr_url?: string;
  pr_number?: number;
  worktree_path?: string;
  cleanup_owner?: string;
  cleanup_state?: string;
  cleanup_blocker?: string;
  cleanup_updated_at?: string;
  status?: string;
  updated_at?: string;
};

type RegistryFile = {
  tenant_slug: string;
  next_job_sequence?: number;
  entries: RegistryEntry[];
};

type SessionMeta = {
  sessionId: string;
  agentId: string;
  jobId?: string;
  workspace: string;
  branch?: string;
  status: string;
  tmuxSessionName?: string;
};

type Worktree = {
  path: string;
  branch?: string;
};

type BranchEvidence = {
  unique: number | null;
  merged: boolean;
  ref: string | null;
  consistent: boolean;
};

type Candidate = {
  branch: string;
  registryFile: string;
  entry: RegistryEntry;
  session: SessionMeta | null;
  worktree: Worktree | null;
  decision: BranchCleanupDecision;
  uniqueCommitsVsMain: number | null;
  mergedIntoMain: boolean;
  mergedPrVerified: boolean;
  hasOpenPr: boolean | null;
  worktreeClean: boolean;
  sessionAlive: boolean;
  sessionEvidenceComplete: boolean;
  branchRefsConsistent: boolean;
  registryLifecycleEligible: boolean;
  protectedBranch: boolean;
  duplicateBranchOwnership: boolean;
};

type Args = {
  apply: boolean;
  janitor: boolean;
  sessionId?: string;
  branch?: string;
  json: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { apply: false, janitor: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--apply') args.apply = true;
    else if (value === '--janitor') args.janitor = true;
    else if (value === '--json') args.json = true;
    else if (value === '--session-id') args.sessionId = argv[++i];
    else if (value === '--branch') args.branch = argv[++i];
    else if (value === '--help' || value === '-h') {
      process.stdout.write(
        [
          'Usage:',
          '  owner:   npm run opsly:agent-cleanup -- --session-id <id> [--apply]',
          '  janitor: npm run opsly:agent-cleanup -- --janitor [--branch <name>] [--apply]',
          '',
          'Default is dry-run. --apply remains fail-closed.',
          '',
        ].join('\n'),
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  if (!args.janitor && !args.sessionId) {
    throw new Error('Owner mode requires --session-id; otherwise use --janitor');
  }
  return args;
}

async function run(
  command: string,
  argv: string[],
  cwd: string,
  allowFailure = false,
): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, argv, { cwd });
    return stdout.trim();
  } catch (error) {
    if (allowFailure) return '';
    const detail = error as { stderr?: string; message?: string };
    throw new Error(
      `${command} ${argv.join(' ')} failed: ${detail.stderr?.trim() || detail.message || 'unknown'}`,
    );
  }
}

async function repoRoot(): Promise<string> {
  return run('git', ['rev-parse', '--show-toplevel'], process.cwd());
}

function runtimeSessionDir(root: string): string {
  return process.env.OPSLY_RUNTIME_STATE_DIR?.trim()
    ? path.resolve(process.env.OPSLY_RUNTIME_STATE_DIR)
    : path.join(root, 'runtime', 'sessions');
}

async function loadSessions(root: string): Promise<Map<string, SessionMeta>> {
  const dir = runtimeSessionDir(root);
  const sessions = new Map<string, SessionMeta>();
  if (!existsSync(dir)) return sessions;
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const parsed = JSON.parse(await readFile(path.join(dir, file), 'utf8')) as SessionMeta;
      if (parsed.sessionId) sessions.set(parsed.sessionId, parsed);
    } catch {
      // Corrupt session evidence never authorizes cleanup.
    }
  }
  return sessions;
}

async function loadRegistryFiles(
  root: string,
): Promise<Array<{ file: string; data: RegistryFile }>> {
  const dir = path.join(root, 'runtime', 'branch-registry');
  if (!existsSync(dir)) return [];
  const result: Array<{ file: string; data: RegistryFile }> = [];
  for (const name of await readdir(dir)) {
    if (!name.endsWith('.json')) continue;
    try {
      const file = path.join(dir, name);
      const data = JSON.parse(await readFile(file, 'utf8')) as RegistryFile;
      if (Array.isArray(data.entries)) result.push({ file, data });
    } catch {
      // Invalid ownership registry cannot authorize deletion.
    }
  }
  return result;
}

async function protectedBranches(root: string): Promise<Set<string>> {
  const policyPath = path.join(root, 'config', 'git-branch-policy.json');
  const defaults = new Set(['main', 'master']);
  try {
    const parsed = JSON.parse(await readFile(policyPath, 'utf8')) as {
      protected_targets?: string[];
    };
    for (const branch of parsed.protected_targets ?? []) defaults.add(branch);
  } catch {
    // Fail closed with known protected defaults.
  }
  return defaults;
}

function duplicateBranches(
  registries: Array<{ file: string; data: RegistryFile }>,
): Set<string> {
  const counts = new Map<string, number>();
  for (const registry of registries) {
    for (const entry of registry.data.entries) {
      counts.set(entry.branch_name, (counts.get(entry.branch_name) ?? 0) + 1);
    }
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([branch]) => branch),
  );
}

async function listWorktrees(root: string): Promise<Worktree[]> {
  const raw = await run('git', ['worktree', 'list', '--porcelain'], root);
  const result: Worktree[] = [];
  let current: Worktree | null = null;
  for (const line of raw.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) result.push(current);
      current = { path: line.slice('worktree '.length) };
    } else if (current && line.startsWith('branch refs/heads/')) {
      current.branch = line.slice('branch refs/heads/'.length);
    } else if (line === '' && current) {
      result.push(current);
      current = null;
    }
  }
  if (current) result.push(current);
  return result;
}

async function hasOpenPr(root: string, branch: string): Promise<boolean | null> {
  const gh = await run('bash', ['-lc', 'command -v gh || true'], root, true);
  if (!gh) return null;
  const raw = await run(
    'gh',
    ['pr', 'list', '--state', 'open', '--head', branch, '--limit', '1', '--json', 'number'],
    root,
    true,
  );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Array<{ number?: number }>;
    return parsed.length > 0;
  } catch {
    return null;
  }
}

function prNumber(entry: RegistryEntry): number | null {
  if (entry.pr_number && Number.isInteger(entry.pr_number) && entry.pr_number > 0) {
    return entry.pr_number;
  }
  const match = entry.pr_url?.match(/\/pull\/(\d+)(?:$|[/?#])/);
  return match ? Number(match[1]) : null;
}

async function mergedPrEvidence(
  root: string,
  entry: RegistryEntry,
): Promise<boolean | null> {
  const number = prNumber(entry);
  if (!number) return false;
  const gh = await run('bash', ['-lc', 'command -v gh || true'], root, true);
  if (!gh) return null;
  const raw = await run(
    'gh',
    ['pr', 'view', String(number), '--json', 'state,mergedAt,headRefName'],
    root,
    true,
  );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      state?: string;
      mergedAt?: string | null;
      headRefName?: string;
    };
    return (
      parsed.state === 'MERGED' &&
      Boolean(parsed.mergedAt) &&
      parsed.headRefName === entry.branch_name
    );
  } catch {
    return null;
  }
}

async function refExists(root: string, ref: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--verify', '--quiet', ref], { cwd: root });
    return true;
  } catch {
    return false;
  }
}

async function refSha(root: string, ref: string): Promise<string | null> {
  const value = await run('git', ['rev-parse', '--verify', ref], root, true);
  return /^[0-9a-f]{40}$/i.test(value) ? value : null;
}

async function branchEvidence(root: string, branch: string): Promise<BranchEvidence> {
  const local = `refs/heads/${branch}`;
  const remote = `refs/remotes/origin/${branch}`;
  const [hasLocal, hasRemote] = await Promise.all([
    refExists(root, local),
    refExists(root, remote),
  ]);

  if (!hasLocal && !hasRemote) {
    return { unique: null, merged: false, ref: null, consistent: true };
  }

  if (hasLocal && hasRemote) {
    const [localSha, remoteSha] = await Promise.all([
      refSha(root, local),
      refSha(root, remote),
    ]);
    if (!localSha || !remoteSha || localSha !== remoteSha) {
      return { unique: null, merged: false, ref: null, consistent: false };
    }
  }

  // Remote ref is authoritative for remote deletion. Fall back to local only
  // when the remote ref is already absent.
  const ref = hasRemote ? remote : local;

  const uniqueRaw = await run(
    'git',
    ['rev-list', '--count', `origin/main..${ref}`],
    root,
    true,
  );
  const unique = /^\d+$/.test(uniqueRaw) ? Number(uniqueRaw) : null;

  let merged = false;
  try {
    await execFileAsync('git', ['merge-base', '--is-ancestor', ref, 'origin/main'], {
      cwd: root,
    });
    merged = true;
  } catch {
    merged = false;
  }

  return { unique, merged, ref, consistent: true };
}

async function isWorktreeClean(worktree: Worktree | null): Promise<boolean> {
  if (!worktree) return true;
  const output = await run(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=all'],
    worktree.path,
    true,
  );
  return output.length === 0;
}

async function isSessionAlive(session: SessionMeta | null, root: string): Promise<boolean> {
  if (!session) return false;
  if (session.tmuxSessionName) {
    const tmux = await run('bash', ['-lc', 'command -v tmux || true'], root, true);
    if (tmux) {
      try {
        await execFileAsync('tmux', ['has-session', '-t', session.tmuxSessionName], {
          cwd: root,
        });
        return true;
      } catch {
        // Fall back to persisted state below.
      }
    }
  }
  return ['created', 'running', 'checkpointed', 'waiting_approval', 'resumable'].includes(
    session.status,
  );
}

function superseded(entry: RegistryEntry): boolean {
  return entry.status === 'closed' && /supersed/i.test(entry.cleanup_blocker ?? '');
}

function lifecycleEligible(entry: RegistryEntry): boolean {
  return ['merged_main', 'closed', 'stale'].includes(entry.status ?? '');
}

function samePath(a: string, b: string): boolean {
  return path.resolve(a) === path.resolve(b);
}

function verifyOwnership(
  entry: RegistryEntry,
  session: SessionMeta | null,
  worktree: Worktree | null,
  args: Args,
): boolean {
  if (!entry.cleanup_owner || entry.cleanup_owner !== entry.worker_id) return false;

  if (entry.session_id) {
    if (!session) return false;
    if (session.sessionId !== entry.session_id) return false;
    if (session.branch !== entry.branch_name) return false;
    if (session.agentId !== entry.worker_id) return false;
    if (!session.jobId || session.jobId !== entry.job_id) return false;
    if (entry.worktree_path && !samePath(session.workspace, entry.worktree_path)) return false;
    if (worktree && !samePath(session.workspace, worktree.path)) return false;
  }

  if (args.sessionId) {
    return entry.session_id === args.sessionId && session?.sessionId === args.sessionId;
  }

  return args.janitor || Boolean(entry.session_id);
}

async function buildCandidate(
  root: string,
  registryFile: string,
  entry: RegistryEntry,
  args: Args,
  protectedSet: Set<string>,
  duplicates: Set<string>,
): Promise<Candidate> {
  const [sessions, worktrees, openPr, evidence, mergedPr] = await Promise.all([
    loadSessions(root),
    listWorktrees(root),
    hasOpenPr(root, entry.branch_name),
    branchEvidence(root, entry.branch_name),
    mergedPrEvidence(root, entry),
  ]);

  const session = entry.session_id ? sessions.get(entry.session_id) ?? null : null;
  const worktree = worktrees.find((item) => item.branch === entry.branch_name) ?? null;
  const worktreeClean = await isWorktreeClean(worktree);
  const sessionAlive = await isSessionAlive(session, root);
  const sessionEvidenceComplete = !entry.session_id || Boolean(session);
  const ownershipVerified = verifyOwnership(entry, session, worktree, args);
  const openPrEvidenceAvailable = openPr !== null && mergedPr !== null;

  const decision = classifyBranchCleanup({
    hasOpenPr: openPr ?? true,
    openPrEvidenceAvailable,
    worktreePresent: Boolean(worktree),
    worktreeClean,
    sessionAlive,
    sessionEvidenceComplete,
    mergedIntoMain: evidence.merged,
    mergedPrVerified: mergedPr === true,
    explicitlySuperseded: superseded(entry),
    uniqueCommitsVsMain: evidence.unique,
    ownershipVerified,
    branchRefsConsistent: evidence.consistent,
    registryLifecycleEligible: lifecycleEligible(entry),
    protectedBranch: protectedSet.has(entry.branch_name),
    duplicateBranchOwnership: duplicates.has(entry.branch_name),
  });

  return {
    branch: entry.branch_name,
    registryFile,
    entry,
    session,
    worktree,
    decision,
    uniqueCommitsVsMain: evidence.unique,
    mergedIntoMain: evidence.merged,
    mergedPrVerified: mergedPr === true,
    hasOpenPr: openPr,
    worktreeClean,
    sessionAlive,
    sessionEvidenceComplete,
    branchRefsConsistent: evidence.consistent,
    registryLifecycleEligible: lifecycleEligible(entry),
    protectedBranch: protectedSet.has(entry.branch_name),
    duplicateBranchOwnership: duplicates.has(entry.branch_name),
  };
}

async function updateRegistryState(
  file: string,
  entryId: string,
  state: string,
  blocker?: string,
): Promise<void> {
  const data = JSON.parse(await readFile(file, 'utf8')) as RegistryFile;
  const entry = data.entries.find((candidate) => candidate.id === entryId);
  if (!entry) return;
  entry.cleanup_state = state;
  entry.cleanup_blocker = blocker;
  entry.cleanup_updated_at = new Date().toISOString();
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function cleanupLockPath(root: string, branch: string): string {
  const safe = branch.replace(/[^A-Za-z0-9._-]+/g, '_');
  return path.join(root, 'runtime', 'branch-cleanup-locks', `${safe}.lock`);
}

async function acquireCleanupLock(
  root: string,
  branch: string,
): Promise<() => Promise<void>> {
  const lockPath = cleanupLockPath(root, branch);
  await mkdir(path.dirname(lockPath), { recursive: true });
  let handle;
  try {
    handle = await open(lockPath, 'wx');
  } catch {
    throw new Error(`cleanup_lock_held:${branch}`);
  }
  await handle.writeFile(
    `${JSON.stringify({ branch, pid: process.pid, acquired_at: new Date().toISOString() })}\n`,
  );
  await handle.close();
  return async () => {
    await unlink(lockPath).catch(() => undefined);
  };
}

async function refreshCandidate(
  root: string,
  candidate: Candidate,
  args: Args,
  protectedSet: Set<string>,
): Promise<Candidate> {
  const registries = await loadRegistryFiles(root);
  const duplicates = duplicateBranches(registries);
  const registry = registries.find((item) => item.file === candidate.registryFile);
  const entry = registry?.data.entries.find((item) => item.id === candidate.entry.id);
  if (!entry) {
    throw new Error(`cleanup_revalidation_missing_registry_entry:${candidate.branch}`);
  }
  return buildCandidate(
    root,
    candidate.registryFile,
    entry,
    args,
    protectedSet,
    duplicates,
  );
}

async function removeCandidate(
  root: string,
  candidate: Candidate,
  args: Args,
  protectedSet: Set<string>,
): Promise<void> {
  const releaseLock = await acquireCleanupLock(root, candidate.branch);
  try {
    // Re-read every destructive input after the lock is held. Branch-backed
    // session creation also checks this lock, closing the startup/delete race.
    const fresh = await refreshCandidate(root, candidate, args, protectedSet);
    if (!fresh.decision.destructiveCleanupAllowed) {
      throw new Error(
        `Refusing cleanup for ${fresh.branch} after revalidation: ${fresh.decision.reason}`,
      );
    }

    if (fresh.worktree && samePath(fresh.worktree.path, root)) {
      throw new Error(
        `Refusing cleanup for ${fresh.branch}: run cleanup from a surviving main/common worktree`,
      );
    }

    if (fresh.worktree) {
      await run('git', ['worktree', 'remove', fresh.worktree.path], root);
    }

    if (await refExists(root, `refs/heads/${fresh.branch}`)) {
      await run('git', ['branch', '-d', fresh.branch], root);
    }

    if (await refExists(root, `refs/remotes/origin/${fresh.branch}`)) {
      await run('git', ['push', 'origin', '--delete', fresh.branch], root);
    }

    await updateRegistryState(
      fresh.registryFile,
      fresh.entry.id,
      'CLEANED',
      undefined,
    );
  } finally {
    await releaseLock();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = await repoRoot();

  await run('git', ['fetch', 'origin', '--prune'], root);

  const [registries, protectedSet] = await Promise.all([
    loadRegistryFiles(root),
    protectedBranches(root),
  ]);
  const duplicates = duplicateBranches(registries);
  const candidates: Candidate[] = [];

  for (const registry of registries) {
    for (const entry of registry.data.entries) {
      if (args.branch && entry.branch_name !== args.branch) continue;
      if (args.sessionId && entry.session_id !== args.sessionId) continue;

      candidates.push(
        await buildCandidate(
          root,
          registry.file,
          entry,
          args,
          protectedSet,
          duplicates,
        ),
      );
    }
  }

  if (!args.janitor && candidates.length !== 1) {
    throw new Error(
      `Owner cleanup requires exactly one registry candidate; found ${candidates.length}`,
    );
  }

  for (const candidate of candidates) {
    if (!args.apply) continue;
    if (candidate.decision.destructiveCleanupAllowed) {
      await removeCandidate(root, candidate, args, protectedSet);
    } else {
      await updateRegistryState(
        candidate.registryFile,
        candidate.entry.id,
        candidate.decision.state,
        candidate.decision.reason,
      );
    }
  }

  const report = candidates.map((candidate) => ({
    branch: candidate.branch,
    worker: candidate.entry.worker_id,
    session_id: candidate.entry.session_id ?? null,
    worktree: candidate.worktree?.path ?? null,
    open_pr: candidate.hasOpenPr,
    session_alive: candidate.sessionAlive,
    session_evidence_complete: candidate.sessionEvidenceComplete,
    worktree_clean: candidate.worktreeClean,
    unique_commits_vs_main: candidate.uniqueCommitsVsMain,
    merged_into_main: candidate.mergedIntoMain,
    merged_pr_verified: candidate.mergedPrVerified,
    branch_refs_consistent: candidate.branchRefsConsistent,
    lifecycle_eligible: candidate.registryLifecycleEligible,
    protected_branch: candidate.protectedBranch,
    duplicate_branch_ownership: candidate.duplicateBranchOwnership,
    cleanup_state: candidate.decision.state,
    cleanup_allowed: candidate.decision.destructiveCleanupAllowed,
    reason: candidate.decision.reason,
    applied: args.apply && candidate.decision.destructiveCleanupAllowed,
  }));

  if (args.json) {
    process.stdout.write(
      `${JSON.stringify({ mode: args.janitor ? 'janitor' : 'owner', apply: args.apply, report }, null, 2)}\n`,
    );
  } else {
    for (const item of report) {
      process.stdout.write(
        `[${item.cleanup_state}] ${item.branch} owner=${item.worker} reason=${item.reason} worktree=${item.worktree ?? '-'}\n`,
      );
    }
    process.stdout.write(
      `mode=${args.janitor ? 'janitor' : 'owner'} apply=${args.apply} scanned=${report.length}\n`,
    );
  }
}

main().catch((error) => {
  console.error(
    `agent-workspace-janitor: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
