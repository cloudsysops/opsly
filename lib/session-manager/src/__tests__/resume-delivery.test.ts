import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tmux = vi.hoisted(() => ({
  sendKeys: vi.fn(),
  capture: vi.fn(async () => ''),
  hasSession: vi.fn(async () => true),
  newSession: vi.fn(async () => undefined),
  killSession: vi.fn(async () => undefined),
}));

// A fake tmux: the session pane "exists", but delivering keys can fail.
vi.mock('../tmux.js', () => ({
  isDryRun: () => false,
  tmuxHasSession: tmux.hasSession,
  tmuxCapturePane: tmux.capture,
  tmuxNewSession: tmux.newSession,
  tmuxSendKeys: tmux.sendKeys,
  tmuxListSessions: async () => [],
  tmuxKillSession: tmux.killSession,
  tmuxSessionName: (id: string) => `opsly-${id}`,
  tmuxWaitUntilGone: async () => undefined,
}));

import { resumeSession } from '../resume.js';
import { checkpointSession, getSession } from '../index.js';
import { saveSession } from '../store.js';

let dir = '';

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'opsly-delivery-'));
  process.env.OPSLY_RUNTIME_STATE_DIR = dir;
  tmux.sendKeys.mockReset();
  tmux.capture.mockReset().mockResolvedValue('');
  tmux.hasSession.mockReset().mockResolvedValue(true);
  tmux.newSession.mockClear();
  tmux.killSession.mockClear();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  delete process.env.OPSLY_RUNTIME_STATE_DIR;
});

async function heldSession(): Promise<void> {
  const now = new Date().toISOString();
  await saveSession({
    sessionId: 'held',
    name: 'held',
    agentId: 'a',
    workspace: '/tmp',
    status: 'waiting_approval',
    createdAt: now,
    lastSeenAt: now,
    tmuxSessionName: 'opsly-held',
    lastCommand: 'npm run deploy',
  });
}

describe('approval delivery failure', () => {
  it('restores waiting_approval and the held command when send-keys fails, so a retry still works', async () => {
    await heldSession();
    tmux.sendKeys.mockRejectedValueOnce(new Error('no server running'));

    await expect(resumeSession({ sessionId: 'held', approveRelaunch: true })).rejects.toThrow(
      /no server running/,
    );
    const after = await getSession('held');
    expect(after?.status).toBe('waiting_approval');
    expect(after?.lastCommand).toBe('npm run deploy');

    // the operator retries and this time it is delivered, exactly once
    tmux.sendKeys.mockResolvedValue(undefined);
    const retried = await resumeSession({ sessionId: 'held', approveRelaunch: true });
    expect(retried.meta.status).toBe('running');
    expect(tmux.sendKeys).toHaveBeenCalledTimes(2);
    expect(tmux.sendKeys).toHaveBeenLastCalledWith('opsly-held', 'npm run deploy');
  });
});

describe('rebuild relaunch delivery failure', () => {
  it('removes the pane it just created so a retry rebuilds and delivers the command', async () => {
    const now = new Date().toISOString();
    await saveSession({
      sessionId: 'dead',
      name: 'dead',
      agentId: 'a',
      workspace: '/tmp',
      status: 'resumable',
      createdAt: now,
      lastSeenAt: now,
      tmuxSessionName: 'opsly-dead',
      lastCommand: 'echo previous',
    });
    // the pane is gone, so resume rebuilds; the first delivery fails
    tmux.hasSession.mockResolvedValue(false);
    tmux.sendKeys.mockRejectedValueOnce(new Error('send-keys failed'));

    await expect(
      resumeSession({ sessionId: 'dead', relaunchCommand: 'npm run build' }),
    ).rejects.toThrow(/send-keys failed/);
    expect(tmux.newSession).toHaveBeenCalledTimes(1);
    // the half-built pane is removed, otherwise a retry would see it alive and skip delivery
    expect(tmux.killSession).toHaveBeenCalledWith('opsly-dead');
    expect((await getSession('dead'))?.status).toBe('resumable');
    expect((await getSession('dead'))?.lastCommand).toBe('echo previous');

    // retry: still no pane (it was removed), so it rebuilds and the command is delivered
    tmux.sendKeys.mockResolvedValue(undefined);
    await resumeSession({ sessionId: 'dead', relaunchCommand: 'npm run build' });
    expect(tmux.newSession).toHaveBeenCalledTimes(2);
    expect(tmux.sendKeys).toHaveBeenLastCalledWith('opsly-dead', 'npm run build');
  });
});

describe('checkpoint racing an approval', () => {
  it('never lets a stale checkpoint resurrect waiting_approval, so the command runs exactly once', async () => {
    await heldSession();
    // pane capture is slow, so the checkpoint loads its state well before it would save
    tmux.capture.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 150));
      return '';
    });
    tmux.sendKeys.mockResolvedValue(undefined);

    await Promise.all([
      checkpointSession('held', 'snapshot'),
      resumeSession({ sessionId: 'held', approveRelaunch: true }),
    ]);
    expect(tmux.sendKeys).toHaveBeenCalledTimes(1);

    // a later approval must NOT see a resurrected waiting_approval and run it again
    await resumeSession({ sessionId: 'held', approveRelaunch: true });
    expect(tmux.sendKeys).toHaveBeenCalledTimes(1);
    expect((await getSession('held'))?.status).not.toBe('waiting_approval');
  });
});
