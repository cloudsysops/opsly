import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { isSafeBranchName } from './guards.js';
import { redactSecrets } from './redact.js';
import { appendSessionLog, loadSession, saveSession } from './store.js';
import { buildRecoverySnapshot, type RecoverySnapshot } from './recovery.js';
import {
  isDryRun,
  tmuxCapturePane,
  tmuxHasSession,
  tmuxKillSession,
  tmuxNewSession,
  tmuxSendKeys,
} from './tmux.js';
import type { RuntimeSessionMetadata } from './types.js';

export interface ResumeSessionInput {
  sessionId: string;
  /** Explicit command to run after rebuild. Passing it is the caller's approval for that command. */
  relaunchCommand?: string;
  /** Human approval to re-run the session's previous `lastCommand`. Off by default. */
  approveRelaunch?: boolean;
  dryRun?: boolean;
}

export type ResumeMode = 'reattach' | 'rebuild' | 'recovery_snapshot';

export interface ResumeSessionResult {
  meta: RuntimeSessionMetadata;
  mode: ResumeMode;
  recovery?: RecoverySnapshot;
  output?: string;
  /** Previous command held back until a human approves it (status is `waiting_approval`). */
  pendingCommand?: string;
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

const execFileAsync = promisify(execFile);

/** Runs git directly (no shell), so branch names can never be interpreted as commands. */
async function checkoutBranch(workspace: string, branch: string): Promise<string | null> {
  if (!isSafeBranchName(branch)) {
    return `skipped checkout: unsafe branch name`;
  }
  try {
    await execFileAsync('git', ['checkout', branch, '--'], { cwd: workspace, timeout: 15000 });
    return null;
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr?.trim();
    return `checkout failed: ${(stderr ?? 'unknown error').split('\n')[0]}`;
  }
}

/**
 * Resumes are serialised per session. Two overlapping approvals (a UI retry, a double submit)
 * would otherwise both read the same `waiting_approval` metadata and both send the held
 * command, running a deploy/push/delete twice. Inside the lock each call re-reads the state,
 * so the second one sees `running` and only reattaches.
 *
 * This covers one orchestrator process; it is not a cross-host lock.
 */
const sessionLocks = new Map<string, Promise<unknown>>();

async function withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  const previous = sessionLocks.get(sessionId) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  const tail = run.catch(() => undefined);
  sessionLocks.set(sessionId, tail);
  try {
    return await run;
  } finally {
    if (sessionLocks.get(sessionId) === tail) {
      sessionLocks.delete(sessionId);
    }
  }
}

/**
 * A held command is only replayable if it needs no sanitising. Metadata written before
 * redaction existed may still hold plaintext credentials: those are never returned, persisted
 * or replayed, and the operator must supply a replacement command explicitly.
 */
function describeHeldCommand(raw: string): { shown: string; replayable: boolean } {
  const shown = redactSecrets(raw);
  return { shown, replayable: raw.length > 0 && shown === raw && !raw.includes('***') };
}

export function resumeSession(input: ResumeSessionInput): Promise<ResumeSessionResult> {
  return withSessionLock(input.sessionId, () => resumeSessionLocked(input));
}

async function resumeSessionLocked(input: ResumeSessionInput): Promise<ResumeSessionResult> {
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
    if (meta.status === 'waiting_approval') {
      // A previous rebuild held a command for approval; the rebuilt tmux session is still
      // alive, so this is where the human's approval arrives.
      const heldRaw = meta.lastCommand?.trim() ?? '';
      const held = describeHeldCommand(heldRaw);
      const explicit = input.relaunchCommand?.trim() ?? '';
      const approved =
        explicit.length > 0
          ? explicit
          : input.approveRelaunch === true && held.replayable
            ? heldRaw
            : '';
      if (approved.length === 0) {
        // Still unapproved (or not replayable): stay in waiting_approval, never flip to running,
        // and scrub any legacy plaintext from the stored metadata.
        const scrubbed =
          held.shown !== heldRaw ? await touch(meta, { lastCommand: held.shown }) : meta;
        return {
          meta: scrubbed,
          mode: 'reattach',
          output,
          pendingCommand: held.shown || undefined,
        };
      }
      // Claim the approval (leave waiting_approval) BEFORE sending anything, and put it back if
      // the command cannot be delivered, so the held command is never silently lost.
      const running = await touch(meta, { status: 'running', lastCommand: redactSecrets(approved) });
      try {
        await tmuxSendKeys(meta.tmuxSessionName, approved);
      } catch (err) {
        await touch(running, { status: 'waiting_approval', lastCommand: meta.lastCommand });
        await appendSessionLog(input.sessionId, 'resume approval not delivered, restored waiting_approval');
        throw err;
      }
      await appendSessionLog(input.sessionId, 'resume relaunch approved (reattach)');
      return { meta: running, mode: 'reattach', output };
    }
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

  // Check the branch out BEFORE rebuilding anything. If it fails (missing branch, hook
  // failure, timeout) the explicit or approved relaunch must not run on the wrong branch or a
  // half-updated tree, so recovery stops here with nothing created and no state changed.
  if (meta.branch && meta.branch.trim().length > 0 && !isDryRun()) {
    const problem = await checkoutBranch(meta.workspace, meta.branch);
    if (problem) {
      await appendSessionLog(input.sessionId, `resume blocked: ${problem}`);
      throw new Error(`Recovery blocked, ${problem}`);
    }
  }

  if (!isDryRun()) {
    await tmuxNewSession(meta.tmuxSessionName, meta.workspace);
  }

  let updated = await touch(meta, { status: 'running' });

  const explicit = input.relaunchCommand?.trim() ?? '';
  const previousRaw = meta.lastCommand?.trim() ?? '';
  const previous = describeHeldCommand(previousRaw);
  let pendingCommand: string | undefined;

  const restoreIfNotDelivered = async (err: unknown): Promise<never> => {
    // This call created the pane. If it stayed alive, a retry would take the "alive" branch and
    // mark the session running without ever delivering the command, so remove it: the retry then
    // rebuilds again and the command is delivered.
    await tmuxKillSession(meta.tmuxSessionName).catch(() => undefined);
    await touch(updated, { status: meta.status, lastCommand: meta.lastCommand });
    await appendSessionLog(input.sessionId, 'resume relaunch not delivered, state restored');
    throw err;
  };

  if (explicit.length > 0) {
    updated = await touch(updated, { lastCommand: redactSecrets(explicit) });
    await tmuxSendKeys(meta.tmuxSessionName, explicit).catch(restoreIfNotDelivered);
  } else if (previousRaw.length > 0 && input.approveRelaunch === true && previous.replayable) {
    await tmuxSendKeys(meta.tmuxSessionName, previousRaw).catch(restoreIfNotDelivered);
    await appendSessionLog(input.sessionId, 'resume relaunch approved');
  } else if (previousRaw.length > 0) {
    // The previous command may be a deploy, push or delete: never replay it unattended. One
    // that had to be sanitised (stored redacted, or legacy plaintext) can never be replayed
    // from state; the caller must supply a replacement via `relaunchCommand`.
    pendingCommand = previous.shown;
    updated = await touch(updated, { status: 'waiting_approval', lastCommand: previous.shown });
    await appendSessionLog(input.sessionId, 'resume holding previous command for approval');
  }

  const output = await tmuxCapturePane(meta.tmuxSessionName, 80);
  await appendSessionLog(input.sessionId, 'resume rebuild');

  return {
    meta: updated,
    mode: 'rebuild',
    recovery,
    output,
    pendingCommand,
  };
}
