import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  captureLogs,
  createSession,
  listSessions,
  sendCommand,
  stopSession,
} from '../index.js';

let stateDir = '';

beforeEach(async () => {
  stateDir = await mkdtemp(path.join(tmpdir(), 'opsly-sessions-'));
  process.env.OPSLY_RUNTIME_STATE_DIR = stateDir;
  process.env.OPSLY_RUNTIME_DRY_RUN = 'true';
});

afterEach(async () => {
  if (stateDir) {
    await rm(stateDir, { recursive: true, force: true });
  }
  delete process.env.OPSLY_RUNTIME_STATE_DIR;
  delete process.env.OPSLY_RUNTIME_DRY_RUN;
});

describe('session-manager dry-run', () => {
  it('creates and lists a session', async () => {
    const created = await createSession({
      name: 'test-agent',
      agentId: 'hermes',
      jobId: 'job-1',
      workspace: '/tmp/opsly',
    });
    expect(created.sessionId.length).toBeGreaterThan(0);
    expect(created.status).toBe('running');

    const all = await listSessions();
    expect(all.some((s) => s.sessionId === created.sessionId)).toBe(true);
  });

  it('sendCommand returns dry-run output', async () => {
    const created = await createSession({
      name: 'cmd',
      agentId: 'codex',
      workspace: '/tmp/opsly',
    });
    const { output } = await sendCommand({
      sessionId: created.sessionId,
      command: 'git status',
      dryRun: true,
    });
    expect(output).toContain('dry-run');

    const logs = await captureLogs(created.sessionId);
    expect(logs.length).toBeGreaterThan(0);
  });

  it('stopSession marks stopped', async () => {
    const created = await createSession({
      name: 'stop',
      agentId: 'claude',
      workspace: '/tmp/opsly',
    });
    const stopped = await stopSession(created.sessionId);
    expect(stopped.status).toBe('stopped');
  });
});
