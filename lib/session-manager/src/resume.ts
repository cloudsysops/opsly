import { appendSessionLog, loadSession, saveSession } from './store.js';
import { buildRecoverySnapshot, type RecoverySnapshot } from './recovery.js';
import {
  isDryRun,
  tmuxCapturePane,
  tmuxHasSession,
  tmuxNewSession,
  tmuxSendKeys,
} from './tmux.js';
import type { RuntimeSessionMetadata } from './types.js';

export interface ResumeSessionInput {
  sessionId: string;
  relaunchCommand?: string;
  dryRun?: boolean;
}

export type ResumeMode = 'reattach' | 'rebuild' | 'recovery_snapshot';

export interface ResumeSessionResult {
  meta: RuntimeSessionMetadata;
  mode: ResumeMode;
  recovery?: RecoverySnapshot;
  output?: string;
}

function nowIso(): string {
  return new Date().toISOString();
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

function branchCheckoutCommand(branch: string): string {
  const safe = branch.replace(/"/g, '');
  return `git checkout "${safe}"`;
}

export async function resumeSession(input: ResumeSessionInput): Promise<ResumeSessionResult> {
  const meta = await loadSession(input.sessionId);
  if (!meta) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }

  if (input.dryRun) {
    return {
      meta,
      mode: 'reattach',
      output: `[dry-run] would resume session ${input.sessionId}`,
    };
  }

  const alive = await tmuxHasSession(meta.tmuxSessionName);
  if (alive) {
    const output = await tmuxCapturePane(meta.tmuxSessionName, 120);
    const updated = await touch(meta, { status: 'running' });
    await appendSessionLog(input.sessionId, 'resume reattach');
    return { meta: updated, mode: 'reattach', output };
  }

  const neverManaged =
    meta.status === 'created' ||
    (meta.status === 'failed' && !meta.lastCommand);

  if (neverManaged) {
    const recovery = await buildRecoverySnapshot(input.sessionId);
    const updated = await touch(meta, { status: 'resumable' });
    await appendSessionLog(input.sessionId, 'resume recovery_snapshot (no live tmux)');
    return {
      meta: updated,
      mode: 'recovery_snapshot',
      recovery,
      output:
        'Session was not running in tmux. Recovery snapshot created; start a new managed session to continue.',
    };
  }

  const recovery = await buildRecoverySnapshot(input.sessionId);

  if (!isDryRun()) {
    await tmuxNewSession(meta.tmuxSessionName, meta.workspace);
  }

  let updated = await touch(meta, { status: 'running' });

  if (meta.branch && meta.branch.trim().length > 0) {
    const checkout = branchCheckoutCommand(meta.branch);
    await tmuxSendKeys(meta.tmuxSessionName, checkout);
    updated = await touch(updated, { lastCommand: checkout });
  }

  const relaunch =
    input.relaunchCommand?.trim() ||
    meta.lastCommand?.trim() ||
    '';
  if (relaunch.length > 0) {
    await tmuxSendKeys(meta.tmuxSessionName, relaunch);
    updated = await touch(updated, { lastCommand: relaunch });
  }

  const output = await tmuxCapturePane(meta.tmuxSessionName, 80);
  await appendSessionLog(input.sessionId, 'resume rebuild');

  return {
    meta: updated,
    mode: 'rebuild',
    recovery,
    output,
  };
}
