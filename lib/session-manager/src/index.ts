import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, open, unlink } from 'node:fs/promises';
import path from 'node:path';

import {
  getBranchByName,
  resolveRepoRoot,
  updateBranchEntry,
} from '@intcloudsysops/git-branch-orchestrator';

import {
  appendSessionLog,
  listStoredSessions,
  loadSession,
  saveSession,
} from './store.js';
import {
  tmuxCapturePane,
  tmuxHasSession,
  tmuxKillSession,
  tmuxListSessions,
  tmuxNewSession,
  tmuxSendKeys,
  tmuxSessionName,
  tmuxWaitUntilGone,
} from './tmux.js';
import type {
  CreateSessionInput,
  RuntimeSessionMetadata,
  RuntimeSessionStatus,
  SendCommandInput,
} from './types.js';

export * from './types.js';
export { resolveStateDir } from './store.js';
export { resumeSession, type ResumeSessionInput, type ResumeSessionResult, type ResumeMode } from './resume.js';
export {
  buildRecoverySnapshot,
  type RecoverySnapshot,
  type RecoveryAction,
} from './recovery.js';

function nowIso(): string {
  return new Date().toISOString();
}

function branchLifecycleLockPath(root: string, branch: string): string {
  const safe = branch.replace(/[^A-Za-z0-9._-]+/g, '_');
  return path.join(root, 'runtime', 'branch-cleanup-locks', `${safe}.lock`);
}

async function withBranchLifecycleLock<T>(
  root: string,
  branch: string,
  fn: () => Promise<T>,
): Promise<T> {
  const lockPath = branchLifecycleLockPath(root, branch);
  await mkdir(path.dirname(lockPath), { recursive: true });
  let handle;
  try {
    handle = await open(lockPath, 'wx');
  } catch {
    throw new Error(`Branch lifecycle is locked for ${branch}; retry after cleanup/session binding completes`);
  }
  await handle.writeFile(
    `${JSON.stringify({ branch, pid: process.pid, mode: 'session-bind', acquired_at: nowIso() })}\n`,
  );
  await handle.close();

  try {
    return await fn();
  } finally {
    await unlink(lockPath).catch(() => undefined);
  }
}

function sessionMayStillOwnBranch(meta: RuntimeSessionMetadata): boolean {
  return ['created', 'running', 'checkpointed', 'waiting_approval', 'resumable'].includes(
    meta.status,
  );
}


function resolveWorkspacePath(workspace: string): string {
  const candidate = workspace.trim();
  if (candidate.length > 0 && existsSync(candidate)) {
    return candidate;
  }
  const root = process.env.OPSLY_ROOT?.trim() ?? '';
  if (root.length > 0 && existsSync(root)) {
    return root;
  }
  return candidate.length > 0 ? candidate : root || '.';
}

async function touch(meta: RuntimeSessionMetadata, patch: Partial<RuntimeSessionMetadata>): Promise<RuntimeSessionMetadata> {
  const next: RuntimeSessionMetadata = {
    ...meta,
    ...patch,
    lastSeenAt: nowIso(),
  };
  await saveSession(next);
  return next;
}

export async function listSessions(): Promise<RuntimeSessionMetadata[]> {
  const stored = await listStoredSessions();
  const live = new Set(await tmuxListSessions());
  return stored.map((s) => ({
    ...s,
    status: live.has(s.tmuxSessionName) ? s.status : s.status === 'stopped' ? 'stopped' : 'resumable',
  }));
}

export async function getSession(sessionId: string): Promise<RuntimeSessionMetadata | null> {
  return loadSession(sessionId);
}

export async function createSession(input: CreateSessionInput): Promise<RuntimeSessionMetadata> {
  const workspace = resolveWorkspacePath(input.workspace);
  const branch = input.branch?.trim();

  const createAndStart = async (
    binding?: { tenantSlug: string; entryId: string; cleanupOwner: string; status: string },
  ): Promise<RuntimeSessionMetadata> => {
    const sessionId = randomUUID();
    const tmuxName = input.tmuxSessionName?.trim()
      ? tmuxSessionName(input.tmuxSessionName.trim().replace(/^opsly-/, ''))
      : tmuxSessionName(sessionId);
    const ts = nowIso();
    const meta: RuntimeSessionMetadata = {
      sessionId,
      name: input.name,
      agentId: input.agentId,
      jobId: input.jobId,
      workspace,
      branch: input.branch,
      status: 'created',
      createdAt: ts,
      lastSeenAt: ts,
      tmuxSessionName: tmuxName,
    };

    await tmuxNewSession(tmuxName, workspace);
    const running = await tmuxHasSession(tmuxName);
    if (running && input.initialCommand && input.initialCommand.trim().length > 0) {
      await tmuxSendKeys(tmuxName, input.initialCommand.trim());
    }
    const updated = await touch(meta, {
      status: running ? 'running' : 'failed',
      lastCommand: input.initialCommand,
    });

    if (binding && branch) {
      const persisted = await updateBranchEntry(binding.tenantSlug, binding.entryId, {
        session_id: sessionId,
        worktree_path: workspace,
        cleanup_owner: binding.cleanupOwner,
        cleanup_state: binding.status === 'pr_open' ? 'PR_OPEN' : 'ACTIVE',
        cleanup_blocker: undefined,
      });
      if (!persisted) {
        await tmuxKillSession(tmuxName).catch(() => undefined);
        throw new Error(`Branch registry entry disappeared while binding ${branch}`);
      }
    }

    await appendSessionLog(
      sessionId,
      `session created agent=${input.agentId} job=${input.jobId ?? '-'}`,
    );
    return updated;
  };

  if (!branch) {
    return createAndStart();
  }

  const tenantSlug = input.tenantSlug?.trim();
  if (!tenantSlug) {
    throw new Error('tenantSlug is required for branch-backed runtime sessions');
  }
  if (!input.jobId?.trim()) {
    throw new Error('jobId is required for branch-backed runtime sessions');
  }

  const root = resolveRepoRoot();
  return withBranchLifecycleLock(root, branch, async () => {
    const entry = await getBranchByName(tenantSlug, branch, root);
    if (!entry) {
      throw new Error(`Branch registry owner not found tenant=${tenantSlug} branch=${branch}`);
    }
    if (entry.worker_id !== input.agentId) {
      throw new Error(
        `Branch worker mismatch branch=${branch} expected=${entry.worker_id} actual=${input.agentId}`,
      );
    }
    if (entry.job_id !== input.jobId) {
      throw new Error(
        `Branch job mismatch branch=${branch} expected=${entry.job_id} actual=${input.jobId}`,
      );
    }
    if (entry.cleanup_state === 'CLEANED') {
      throw new Error(`Branch ${branch} is already marked CLEANED`);
    }
    if (entry.worktree_path && path.resolve(entry.worktree_path) !== path.resolve(workspace)) {
      throw new Error(
        `Branch workspace mismatch branch=${branch} expected=${entry.worktree_path} actual=${workspace}`,
      );
    }

    if (entry.session_id) {
      const existing = await loadSession(entry.session_id);
      if (!existing) {
        throw new Error(
          `Existing branch session evidence unavailable branch=${branch} session=${entry.session_id}`,
        );
      }
      const tmuxLive = await tmuxHasSession(existing.tmuxSessionName);
      if (tmuxLive || sessionMayStillOwnBranch(existing)) {
        throw new Error(
          `Branch already owned by live session branch=${branch} session=${entry.session_id}`,
        );
      }
    }

    return createAndStart({
      tenantSlug,
      entryId: entry.id,
      cleanupOwner: entry.cleanup_owner ?? entry.worker_id,
      status: entry.status,
    });
  });
}

export async function sendCommand(input: SendCommandInput): Promise<{ meta: RuntimeSessionMetadata; output: string }> {
  const meta = await loadSession(input.sessionId);
  if (!meta) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }
  if (input.dryRun) {
    return { meta, output: `[dry-run] would run: ${input.command}` };
  }
  await tmuxSendKeys(meta.tmuxSessionName, input.command);
  const output = await tmuxCapturePane(meta.tmuxSessionName);
  const updated = await touch(meta, { status: 'running', lastCommand: input.command });
  await appendSessionLog(input.sessionId, `command: ${input.command.slice(0, 200)}`);
  return { meta: updated, output };
}

export async function captureLogs(sessionId: string, lines = 200): Promise<string> {
  const meta = await loadSession(sessionId);
  if (!meta) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return tmuxCapturePane(meta.tmuxSessionName, lines);
}

export async function stopSession(sessionId: string): Promise<RuntimeSessionMetadata> {
  const meta = await loadSession(sessionId);
  if (!meta) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  await tmuxKillSession(meta.tmuxSessionName);
  return touch(meta, { status: 'stopped' });
}

export async function checkpointSession(
  sessionId: string,
  note?: string
): Promise<RuntimeSessionMetadata> {
  const meta = await loadSession(sessionId);
  if (!meta) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  const output = await tmuxCapturePane(meta.tmuxSessionName, 80);
  const updated = await touch(meta, {
    status: 'checkpointed',
    lastCheckpoint: note ?? output.slice(-500),
  });
  await appendSessionLog(sessionId, `checkpoint ${note ?? 'auto'}`);
  return updated;
}

export function mapLifecycleFromStatus(status: RuntimeSessionStatus): string {
  switch (status) {
    case 'created':
      return 'SESSION_CREATED';
    case 'running':
      return 'RUNNING';
    case 'checkpointed':
      return 'CHECKPOINTED';
    case 'waiting_approval':
      return 'WAITING_APPROVAL';
    case 'stopped':
      return 'COMPLETED';
    case 'failed':
      return 'FAILED';
    case 'resumable':
      return 'RESUMABLE';
    default:
      return 'QUEUED';
  }
}


export async function waitForSessionExit(sessionId: string, timeoutMs = 300000): Promise<RuntimeSessionMetadata> {
  const meta = await loadSession(sessionId);
  if (!meta) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  await tmuxWaitUntilGone(meta.tmuxSessionName, timeoutMs);
  return touch(meta, { status: 'stopped' });
}
