import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { isSafeBranchName } from '../guards.js';
import { compactPaneTail, redactSecrets } from '../redact.js';
import { parsePorcelainZ } from '../recovery.js';
import { createSession, getSession, listSessions } from '../index.js';

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

