import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

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
  const sessionId = randomUUID();
  const tmuxName = tmuxSessionName(sessionId);
  const ts = nowIso();
  const workspace = resolveWorkspacePath(input.workspace);
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
  await appendSessionLog(sessionId, `session created agent=${input.agentId} job=${input.jobId ?? '-'}`);
  return updated;
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
