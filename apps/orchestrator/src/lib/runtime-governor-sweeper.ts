/**
 * Idle session sweeper — stops tmux sessions past agent_idle_timeout_minutes.
 */
import { listSessions, stopSession } from '@intcloudsysops/session-manager';

import { loadRuntimeGovernorConfig } from './runtime-governor.js';

export interface IdleSweepResult {
  scanned: number;
  stopped: string[];
  skipped: string[];
  errors: string[];
}

export async function sweepIdleSessions(): Promise<IdleSweepResult> {
  const cfg = await loadRuntimeGovernorConfig();
  const timeoutMs = cfg.agent_idle_timeout_minutes * 60 * 1000;
  const now = Date.now();

  const result: IdleSweepResult = {
    scanned: 0,
    stopped: [],
    skipped: [],
    errors: [],
  };

  const sessions = await listSessions();
  result.scanned = sessions.length;

  for (const session of sessions) {
    if (session.status !== 'running' && session.status !== 'created') {
      result.skipped.push(session.sessionId);
      continue;
    }
    const last = new Date(session.lastSeenAt).getTime();
    if (Number.isNaN(last) || now - last < timeoutMs) {
      result.skipped.push(session.sessionId);
      continue;
    }
    try {
      await stopSession(session.sessionId);
      result.stopped.push(session.sessionId);
    } catch (err) {
      result.errors.push(
        `${session.sessionId}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}

let sweeperTimer: ReturnType<typeof setInterval> | null = null;

export function startRuntimeGovernorSweeper(intervalMinutes = 5): void {
  if (sweeperTimer) {
    return;
  }
  const ms = Math.max(60_000, intervalMinutes * 60 * 1000);
  sweeperTimer = setInterval(() => {
    void sweepIdleSessions().then((r) => {
      if (r.stopped.length > 0) {
        process.stdout.write(
          JSON.stringify({
            event: 'governor_idle_sweep',
            stopped: r.stopped.length,
            errors: r.errors.length,
          }) + '\n'
        );
      }
    });
  }, ms);
  sweeperTimer.unref?.();
}

export function stopRuntimeGovernorSweeper(): void {
  if (sweeperTimer) {
    clearInterval(sweeperTimer);
    sweeperTimer = null;
  }
}
