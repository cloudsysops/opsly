#!/usr/bin/env node
/**
 * Smoke test for Opsly Agent Runtime (session-manager dry-run).
 * Usage: OPSLY_RUNTIME_DRY_RUN=true node scripts/opsly-runtime-smoke.mjs
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.OPSLY_RUNTIME_DRY_RUN = process.env.OPSLY_RUNTIME_DRY_RUN ?? 'true';

const stateDir = await mkdtemp(path.join(tmpdir(), 'opsly-runtime-smoke-'));
process.env.OPSLY_RUNTIME_STATE_DIR = stateDir;

try {
  const { createSession, listSessions, sendCommand, stopSession } = await import(
    path.join(repoRoot, 'lib/session-manager/dist/index.js')
  );

  const created = await createSession({
    name: 'smoke',
    agentId: 'smoke',
    workspace: repoRoot,
    initialCommand: 'echo smoke',
  });
  console.log('created', created.sessionId, created.status);

  const all = await listSessions();
  console.log('sessions', all.length);

  const sent = await sendCommand({
    sessionId: created.sessionId,
    command: 'pwd',
    dryRun: true,
  });
  console.log('send', sent.output.slice(0, 80));

  const stopped = await stopSession(created.sessionId);
  console.log('stopped', stopped.status);
  console.log('OK opsly-runtime-smoke');
} catch (err) {
  console.error('FAIL', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await rm(stateDir, { recursive: true, force: true });
}
