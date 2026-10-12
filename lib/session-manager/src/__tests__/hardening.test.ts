import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { isSafeBranchName } from '../guards.js';
import { compactPaneTail, redactSecrets } from '../redact.js';
import { parsePorcelainZ } from '../recovery.js';
import { checkpointSession, createSession, getSession, listSessions } from '../index.js';
import { saveSession } from '../store.js';
import { gitCheckpointState } from '../recovery.js';
import { execFileSync } from 'node:child_process';
import { writeFile as writeFileFs, mkdir as mkdirFs } from 'node:fs/promises';

let stateDir = '';

beforeEach(async () => {
  stateDir = await mkdtemp(path.join(tmpdir(), 'opsly-hardening-'));
  process.env.OPSLY_RUNTIME_STATE_DIR = stateDir;
  process.env.OPSLY_RUNTIME_DRY_RUN = 'true';
});

afterEach(async () => {
  await rm(stateDir, { recursive: true, force: true });
  delete process.env.OPSLY_RUNTIME_STATE_DIR;
  delete process.env.OPSLY_RUNTIME_DRY_RUN;
});

describe('redactSecrets', () => {
  it.each([
    ['Authorization: Bearer sk-live-ABC123SECRET', 'ABC123SECRET'],
    ['curl -H "Authorization: Bearer abcdefgh12345678"', 'abcdefgh12345678'],
    ['export API_KEY=hunter2hunter2', 'hunter2hunter2'],
    ['password: "correct horse"', 'correct horse'],
    ['token=ghp_abcdefghijklmnopqrstuvwxyz0123', 'ghp_abcdefghijklmnopqrstuvwxyz0123'],
    ['AWS AKIAIOSFODNN7EXAMPLE', 'AKIAIOSFODNN7EXAMPLE'],
    ['jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijk', 'eyJhbGciOiJIUzI1NiJ9'],
  ])('removes secret from %s', (input, secret) => {
    expect(redactSecrets(input)).not.toContain(secret);
  });

  it('leaves ordinary text untouched', () => {
    expect(redactSecrets('npm run build && git status')).toBe('npm run build && git status');
  });

  it('compactPaneTail drops trailing blank lines and bounds length', () => {
    const out = compactPaneTail(`${'x'.repeat(900)}\nDONE\n\n\n\n`, 100);
    expect(out.endsWith('DONE')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(100);
  });
});

describe('isSafeBranchName', () => {
  it.each(['main', 'feat/session-recovery', 'fix/a.b_c-1', 'release/1.2.3'])('accepts %s', (b) => {
    expect(isSafeBranchName(b)).toBe(true);
  });
  it.each([
    'x$(touch /tmp/p)',
    'x`id`',
    'a b',
    '-D',
    'a;rm -rf ~',
    'a"b',
    "a'b",
    'a..b',
    'a/',
    'x.lock',
    '',
  ])('rejects %j', (b) => {
    expect(isSafeBranchName(b)).toBe(false);
  });

  it('createSession rejects an unsafe branch before touching tmux or disk', async () => {
    await expect(
      createSession({ name: 'x', agentId: 'a', workspace: '/tmp', branch: 'x$(id)' }),
    ).rejects.toThrow(/Unsafe branch/);
    expect(await listSessions()).toHaveLength(0);
  });
});

describe('parsePorcelainZ', () => {
  it('includes untracked and staged files and handles renames', () => {
    const out = parsePorcelainZ(' M a.ts\0?? new file.txt\0A  b.ts\0R  new.ts\0old.ts\0');
    expect(out).toEqual(['a.ts', 'new file.txt', 'b.ts', 'new.ts']);
  });
});

describe('store durability', () => {
  it('a corrupt session file is skipped in listings and surfaced by getSession', async () => {
    const good = await createSession({ name: 'ok', agentId: 'a', workspace: '/tmp' });
    await writeFile(path.join(stateDir, 'broken.json'), '{"sessionId":"', 'utf8');
    const all = await listSessions();
    expect(all.map((s) => s.sessionId)).toEqual([good.sessionId]);
    await expect(getSession('broken')).rejects.toThrow(/corrupt/i);
    expect(await getSession('does-not-exist')).toBeNull();
  });

  it('writes atomically (no leftover temp files, valid JSON)', async () => {
    const s = await createSession({ name: 'ok', agentId: 'a', workspace: '/tmp' });
    const { readdir } = await import('node:fs/promises');
    const files = (await readdir(stateDir)).filter((f) => f !== 'logs');
    expect(files).toEqual([`${s.sessionId}.json`]);
    JSON.parse(await readFile(path.join(stateDir, files[0]), 'utf8'));
  });
});

describe('review follow-ups', () => {
  it('redacts a quoted secret even when truncation removed the closing quote', () => {
    const cmd = `export password="${'S3CRETvalue'.repeat(30)}"`;
    expect(redactSecrets(cmd.slice(0, 200))).not.toContain('S3CRET');
    expect(redactSecrets("echo token='abc12345")).not.toContain('abc12345');
  });

  it('concurrent saveSession calls on one session never collide on the temp file', async () => {
    const now = new Date().toISOString();
    const meta = (n: number) => ({
      sessionId: 'same',
      name: 'x',
      agentId: 'a',
      workspace: '/tmp',
      status: 'running' as const,
      createdAt: now,
      lastSeenAt: now,
      tmuxSessionName: 'opsly-same',
      lastCommand: `c${n}`,
    });
    const results = await Promise.allSettled(
      Array.from({ length: 40 }, (_, i) => saveSession(meta(i))),
    );
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(0);
    expect((await getSession('same'))?.sessionId).toBe('same');
  });
});

describe('second review round', () => {
  it('redacts secrets behind quoted JSON keys and escaped quotes', () => {
    expect(redactSecrets('{"password":"correct horse"}')).not.toContain('correct horse');
    expect(redactSecrets('{"api_key": "abcdef123456"}')).not.toContain('abcdef123456');
    expect(redactSecrets('{"token":"ab\\"cdefghijkl"}')).not.toContain('cdefghijkl');
    expect(redactSecrets("{'secret':'s3cr3tvalue'}")).not.toContain('s3cr3tvalue');
  });

  it('still leaves harmless JSON alone', () => {
    expect(redactSecrets('{"name":"build","status":"ok"}')).toBe('{"name":"build","status":"ok"}');
  });

  it('bounds the checkpoint snapshot but keeps the real total', async () => {
    delete process.env.OPSLY_RUNTIME_DRY_RUN;
    const repo = await mkdtemp(path.join(tmpdir(), 'opsly-bounded-'));
    try {
      execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: repo });
      await mkdirFs(path.join(repo, 'gen'));
      await Promise.all(
        Array.from({ length: 450 }, (_, i) => writeFileFs(path.join(repo, 'gen', `f${i}.txt`), 'x')),
      );
      const state = await gitCheckpointState(repo);
      expect(state.dirtyFiles).toHaveLength(200);
      expect(state.dirtyTotal).toBe(450);
      expect(state.dirtyTruncated).toBe(true);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });
});

describe('third review round', () => {
  it('keeps waiting_approval visible when its tmux session is gone', async () => {
    const created = await createSession({ name: 'held', agentId: 'a', workspace: '/tmp' });
    const { getSession: get } = await import('../index.js');
    const stored = await get(created.sessionId);
    await saveSession({ ...stored!, status: 'waiting_approval' });
    // dry-run lists no live tmux sessions, i.e. every pane is "gone"
    const listed = (await listSessions()).find((s) => s.sessionId === created.sessionId);
    expect(listed?.status).toBe('waiting_approval');
  });

  it('still projects other statuses to resumable when tmux is gone', async () => {
    const created = await createSession({ name: 'run', agentId: 'a', workspace: '/tmp' });
    const listed = (await listSessions()).find((s) => s.sessionId === created.sessionId);
    expect(listed?.status).toBe('resumable');
  });
});

describe('fourth review round', () => {
  it.each([
    ['docker login --password correcthorsebattery', 'correcthorsebattery'],
    ['doppler configure set token dp.st.correcthorsebattery', 'correcthorsebattery'],
    ['npm config set _authToken correcthorsebattery', 'correcthorsebattery'],
    ['curl --user alice:correcthorsebattery https://x.test', 'correcthorsebattery'],
    ['curl -u alice:correcthorsebattery https://x.test', 'correcthorsebattery'],
    ['git clone https://bob:correcthorsebattery@github.com/x/y', 'correcthorsebattery'],
    ['tool --api-key "correct horse battery"', 'correct horse battery'],
    ['tool --client-secret correcthorsebattery --verbose', 'correcthorsebattery'],
  ])('redacts space-separated credentials in %s', (input, secret) => {
    expect(redactSecrets(input)).not.toContain(secret);
  });

  it.each([
    'npm run build -- --watch --token-count 5',
    'git clone https://github.com/x/y',
    'git set-url origin https://github.com/x/y',
    'docker login registry.example.com',
    'ls -u',
    'echo done',
  ])('leaves ordinary command %j unchanged', (input) => {
    expect(redactSecrets(input)).toBe(input);
  });

  it('keeps waiting_approval across a checkpoint', async () => {
    const created = await createSession({ name: 'held', agentId: 'a', workspace: '/tmp' });
    const stored = await getSession(created.sessionId);
    await saveSession({ ...stored!, status: 'waiting_approval', lastCommand: 'git push' });
    const cp = await checkpointSession(created.sessionId, 'note');
    expect(cp.status).toBe('waiting_approval');
    expect(cp.lastCheckpoint).toBe('note');
    expect(cp.lastCommand).toBe('git push');
  });
});
