#!/usr/bin/env tsx
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
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
  cleanup_owner?: string;
  cleanup_state?: string;
  cleanup_blocker?: string;
  cleanup_updated_at?: string;
  status?: string;
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

type Candidate = {
  branch: string;
  registryFile: string;
  entry: RegistryEntry;
  session: SessionMeta | null;
  worktree: Worktree | null;
  decision: BranchCleanupDecision;
  uniqueCommitsVsMain: number | null;
  mergedIntoMain: boolean;
  hasOpenPr: boolean;
  worktreeClean: boolean;
  sessionAlive: boolean;
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

async function loadSessions(root: string): Promise<Map<string, SessionMeta>> {
  const dir = process.env.OPSLY_RUNTIME_STATE_DIR?.trim()
    ? path.resolve(process.env.OPSLY_RUNTIME_STATE_DIR)
    : path.join(root, 'runtime', 'sessions');
  const sessions = new Map<string, SessionMeta>();
  if (!existsSync(dir)) return sessions;
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const parsed = JSON.parse(await readFile(path.join(dir, file), 'utf8')) as SessionMeta;
      if (parsed.sessionId) sessions.set(parsed.sessionId, parsed);
    } catch {
      // Corrupt session evidence must never authorize cleanup.
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

async function openPrHeads(root: string): Promise<Set<string> | null> {
  const gh = await run('bash', ['-lc', 'command -v gh || true'], root, true);
  if (!gh) return null;
  const raw = await run(
    'gh',
    ['pr', 'list', '--state', 'open', '--limit', '500', '--json', 'headRefName'],
    root,
    true,
  );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Array<{ headRefName?: string }>;
    return new Set(parsed.map((item) => item.headRefName).filter(Boolean) as string[]);
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

async function branchEvidence(
  root: string,
  branch: string,
): Promise<{ unique: number | null; merged: boolean; ref: string | null }> {
  const local = `refs/heads/${branch}`;
  const remote = `refs/remotes/origin/${branch}`;
  const ref = (await refExists(root, local))
    ? local
    : (await refExists(root, remote))
      ? remote
      : null;

  if (!ref) {
    // Absence of a branch ref is not proof of merge. It may have been deleted,
    // renamed or pruned before this node observed the durable merge evidence.
    return { unique: null, merged: false, ref: null };
  }

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

  return { unique, merged, ref };
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

function verifyOwnership(
  entry: RegistryEntry,
  session: SessionMeta | null,
  args: Args,
): boolean {
  if (!entry.cleanup_owner || entry.cleanup_owner !== entry.worker_id) return false;

  if (args.sessionId) {
    return (
      entry.session_id === args.sessionId &&
      session?.sessionId === args.sessionId &&
      session.branch === entry.branch_name
    );
  }

  if (entry.session_id && session) {
    return (
      session.sessionId === entry.session_id &&
      session.branch === entry.branch_name
    );
  }

  // Janitor may reconcile a branch whose session evidence has already expired,
  // but only when the registry itself contains explicit owner identity.
  return args.janitor;
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

async function removeCandidate(root: string, candidate: Candidate): Promise<void> {
  if (!candidate.decision.destructiveCleanupAllowed) {
    throw new Error(`Refusing cleanup for ${candidate.branch}: ${candidate.decision.reason}`);
  }

  if (candidate.worktree) {
    await run('git', ['worktree', 'remove', candidate.worktree.path], root);
  }

  if (await refExists(root, `refs/heads/${candidate.branch}`)) {
    // -d intentionally re-verifies merge ancestry locally; never force-delete.
    await run('git', ['branch', '-d', candidate.branch], root);
  }

  if (await refExists(root, `refs/remotes/origin/${candidate.branch}`)) {
    // Remote deletion only after classifier + ancestry/unique-commit evidence.
    await run('git', ['push', 'origin', '--delete', candidate.branch], root);
  }

  await updateRegistryState(
    candidate.registryFile,
    candidate.entry.id,
    'CLEANED',
    undefined,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = await repoRoot();

  await run('git', ['fetch', 'origin', '--prune'], root);

  const [sessions, registries, worktrees, openHeads] = await Promise.all([
    loadSessions(root),
    loadRegistryFiles(root),
    listWorktrees(root),
    openPrHeads(root),
  ]);

  const candidates: Candidate[] = [];

  for (const registry of registries) {
    for (const entry of registry.data.entries) {
      if (args.branch && entry.branch_name !== args.branch) continue;
      if (args.sessionId && entry.session_id !== args.sessionId) continue;

      const session = entry.session_id ? sessions.get(entry.session_id) ?? null : null;
      const worktree =
        worktrees.find((candidate) => candidate.branch === entry.branch_name) ?? null;
      const worktreeClean = await isWorktreeClean(worktree);
      const sessionAlive = await isSessionAlive(session, root);
      const evidence = await branchEvidence(root, entry.branch_name);
      const ownershipVerified = verifyOwnership(entry, session, args);
      const hasOpenPr = openHeads === null ? true : openHeads.has(entry.branch_name);

      const decision = classifyBranchCleanup({
        hasOpenPr,
        worktreePresent: Boolean(worktree),
        worktreeClean,
        sessionAlive,
        mergedIntoMain: evidence.merged,
        explicitlySuperseded: superseded(entry),
        uniqueCommitsVsMain: evidence.unique,
        ownershipVerified,
      });

      candidates.push({
        branch: entry.branch_name,
        registryFile: registry.file,
        entry,
        session,
        worktree,
        decision,
        uniqueCommitsVsMain: evidence.unique,
        mergedIntoMain: evidence.merged,
        hasOpenPr,
        worktreeClean,
        sessionAlive,
      });
    }
  }

  if (args.apply && openHeads === null) {
    throw new Error('Refusing --apply: GitHub open-PR evidence unavailable');
  }

  for (const candidate of candidates) {
    if (!args.apply) continue;
    if (candidate.decision.destructiveCleanupAllowed) {
      await removeCandidate(root, candidate);
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
    worktree_clean: candidate.worktreeClean,
    unique_commits_vs_main: candidate.uniqueCommitsVsMain,
    merged_into_main: candidate.mergedIntoMain,
    cleanup_state: candidate.decision.state,
    cleanup_allowed: candidate.decision.destructiveCleanupAllowed,
    reason: candidate.decision.reason,
    applied: args.apply && candidate.decision.destructiveCleanupAllowed,
  }));

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ mode: args.janitor ? 'janitor' : 'owner', apply: args.apply, report }, null, 2)}\n`);
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
