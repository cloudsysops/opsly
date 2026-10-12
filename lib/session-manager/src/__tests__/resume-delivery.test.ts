import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tmux = vi.hoisted(() => ({
  sendKeys: vi.fn(),
}));

// A fake tmux: the session pane "exists", but delivering keys can fail.
vi.mock('../tmux.js', () => ({
  isDryRun: () => false,
  tmuxHasSession: async () => true,
  tmuxCapturePane: async () => '',
  tmuxNewSession: async () => undefined,
  tmuxSendKeys: tmux.sendKeys,
  tmuxListSessions: async () => [],
  tmuxKillSession: async () => undefined,
  tmuxSessionName: (id: string) => `opsly-${id}`,
  tmuxWaitUntilGone: async () => undefined,
}));

import { resumeSession } from '../resume.js';
import { getSession } from '../index.js';
import { saveSession } from '../store.js';

let dir = '';

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'opsly-delivery-'));
  process.env.OPSLY_RUNTIME_STATE_DIR = dir;
  tmux.sendKeys.mockReset();
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
