import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  checkpointSession,
  createSession,
  getSession,
  listSessions,
  resumeSession,
  stopSession,
} from '../index.js';
import { tmuxHasSession, tmuxKillSession } from '../tmux.js';

function hasTmux(): boolean {
  try {
    execFileSync('tmux', ['-V'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(check: () => Promise<boolean> | boolean, ms = 4000): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await check()) return true;
    await sleep(100);
  }
  return false;
}

// Real tmux, no dry-run: the dry-run suites cannot catch recovery bugs.
describe.skipIf(!hasTmux())('session recovery against real tmux', () => {
  let base = '';
  let workspace = '';
  const created: string[] = [];

  beforeEach(async () => {
    base = await mkdtemp(path.join(tmpdir(), 'opsly-tmux-it-'));
    workspace = path.join(base, 'repo');
    await mkdir(workspace);
    process.env.OPSLY_RUNTIME_STATE_DIR = path.join(base, 'state');
    process.env.OPSLY_ROOT = base;
    delete process.env.OPSLY_RUNTIME_DRY_RUN;
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: workspace, stdio: 'ignore' });
    git('init', '-q', '-b', 'main');
    git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init');
    git('checkout', '-q', '-b', 'feat/demo');
  });

  afterEach(async () => {
    for (const name of created.splice(0)) {
      await tmuxKillSession(name).catch(() => undefined);
    }
    await rm(base, { recursive: true, force: true });
    delete process.env.OPSLY_RUNTIME_STATE_DIR;
    delete process.env.OPSLY_ROOT;
  });

  async function start(initialCommand: string, branch = 'feat/demo') {
    const s = await createSession({
      name: 'it',
      agentId: 'claude',
      workspace,
      branch,
      initialCommand,
    });
    created.push(s.tmuxSessionName);
    return s;
  }

  it('rebuilds a crashed session but holds the previous command for approval', async () => {
    const marker = path.join(base, 'replayed');
    const s = await start(`touch ${marker}`);
    expect(await waitFor(() => existsSync(marker))).toBe(true);
    await checkpointSession(s.sessionId);
    await rm(marker);

    await tmuxKillSession(s.tmuxSessionName); // crash, not stopSession
    expect((await listSessions())[0].status).toBe('resumable');

    const result = await resumeSession({ sessionId: s.sessionId });
    expect(result.mode).toBe('rebuild');
    expect(await tmuxHasSession(s.tmuxSessionName)).toBe(true);
    expect(result.meta.status).toBe('waiting_approval');
    expect(result.pendingCommand).toBe(`touch ${marker}`);

    await sleep(600);
    expect(existsSync(marker)).toBe(false); // previous command was NOT replayed

    // a resume WITHOUT approval must not release the command or flip the status
    const stillHeld = await resumeSession({ sessionId: s.sessionId });
    expect(stillHeld.meta.status).toBe('waiting_approval');
    expect(stillHeld.pendingCommand).toBe(`touch ${marker}`);
    await sleep(400);
    expect(existsSync(marker)).toBe(false);

    // human approves through the normal flow: the rebuilt tmux session is STILL ALIVE
    expect(await tmuxHasSession(s.tmuxSessionName)).toBe(true);
    const approved = await resumeSession({ sessionId: s.sessionId, approveRelaunch: true });
    expect(approved.pendingCommand).toBeUndefined();
    expect(approved.meta.status).toBe('running');
    expect(await waitFor(() => existsSync(marker))).toBe(true);
  });

  it('never executes shell syntax hidden in a stored branch name', async () => {
    const marker = path.join(base, 'PWNED');
    const s = await start('true');
    // simulate a session file written before validation existed
    const file = path.join(base, 'state', `${s.sessionId}.json`);
    const meta = JSON.parse(await readFile(file, 'utf8'));
    meta.branch = `x$(touch ${marker})`;
    await writeFile(file, JSON.stringify(meta), 'utf8');

    await tmuxKillSession(s.tmuxSessionName);
    await resumeSession({ sessionId: s.sessionId });
    await sleep(800);
    expect(existsSync(marker)).toBe(false);
  });

  it('checkpoint is structured and never stores secrets echoed by the pane', async () => {
    await writeFile(path.join(workspace, 'new-file.txt'), 'untracked work\n');
    const s = await start('echo "Authorization: Bearer sk-live-ABC123SECRET"');
    await sleep(700);
    const cp = await checkpointSession(s.sessionId);

    expect(cp.checkpointData?.gitBranch).toBe('feat/demo');
    expect(cp.checkpointData?.gitSha).toMatch(/^[0-9a-f]{40}$/);
    expect(cp.checkpointData?.dirtyFiles).toContain('new-file.txt');
    const raw = await readFile(path.join(base, 'state', `${s.sessionId}.json`), 'utf8');
    expect(raw).not.toContain('ABC123SECRET');
    expect(cp.lastCheckpoint?.endsWith('\n')).toBe(false);
  });

  it('recovery snapshot reports untracked files as changes', async () => {
    const s = await start('true');
    await writeFile(path.join(workspace, 'agent-output.txt'), 'x\n');
    await tmuxKillSession(s.tmuxSessionName);
    const result = await resumeSession({ sessionId: s.sessionId });
    expect(result.recovery?.changedFiles).toContain('agent-output.txt');
    expect(result.recovery?.recommendedActions).toContain('merge');
  });

  it('does not replay a stored command whose secrets were redacted, even when approved', async () => {
    const s = await start('echo token=abcdef123456');
    await sleep(500);
    await tmuxKillSession(s.tmuxSessionName);
    const result = await resumeSession({ sessionId: s.sessionId, approveRelaunch: true });
    expect(result.pendingCommand).toContain('***');
    expect(result.meta.status).toBe('waiting_approval');
  });

  it('stopped sessions stay stopped and are still readable', async () => {
    const s = await start('true');
    const stopped = await stopSession(s.sessionId);
    expect(stopped.status).toBe('stopped');
    expect((await getSession(s.sessionId))?.status).toBe('stopped');
  });
});
