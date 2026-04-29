import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { Job, Worker } from 'bullmq';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import {
  appendSessionOutput,
  completeTerminalSession,
  failTerminalSession,
  setSessionChild,
  setSessionCommand,
  startTerminalSession,
} from './terminal-session-store.js';

interface TerminalTaskPayload {
  agent_id?: string;
  commands?: unknown;
  tenant_slug?: string;
  timeout_seconds?: number;
  cwd?: string;
}

interface TerminalTaskJobData {
  payload?: TerminalTaskPayload;
  tenant_slug?: string;
}

const DEFAULT_TIMEOUT_SECONDS = 180;
const MAX_TIMEOUT_SECONDS = 1800;

function sanitizeAgentId(agentId: string): string {
  return agentId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function runCommand(
  agentId: string,
  command: string,
  cwd: string,
  timeoutSeconds: number
): Promise<number | null> {
  return new Promise((resolveCommand, rejectCommand) => {
    const shell = process.env.SHELL || '/bin/bash';
    const child = spawn(shell, ['-lc', command], {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    setSessionChild(agentId, child);
    child.stdout.on('data', (chunk: Buffer) => appendSessionOutput(agentId, chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => appendSessionOutput(agentId, chunk.toString()));

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      rejectCommand(new Error(`command timeout after ${timeoutSeconds}s`));
    }, timeoutSeconds * 1000);

    child.on('error', (error) => {
      clearTimeout(timeout);
      rejectCommand(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolveCommand(code);
        return;
      }
      rejectCommand(new Error(`command failed with exit code ${String(code)}`));
    });
  });
}

export function startTerminalWorker(connection: object): Worker {
  const concurrency = getWorkerConcurrency('terminal');
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'terminal_task') {
        return;
      }
      const t0 = Date.now();
      logWorkerLifecycle('start', 'terminal', job);
      try {
        const data = job.data as TerminalTaskJobData;
        const payload = data.payload ?? {};

        const rawAgentId = typeof payload.agent_id === 'string' ? payload.agent_id.trim() : '';
        const agentId = rawAgentId.length > 0 ? rawAgentId : `agent-${randomUUID()}`;
        const tenantSlug =
          typeof payload.tenant_slug === 'string' && payload.tenant_slug.trim().length > 0
            ? payload.tenant_slug.trim()
            : (data.tenant_slug ?? 'opsly-internal');
        const commands = isStringArray(payload.commands)
          ? payload.commands.map((c) => c.trim()).filter((c) => c.length > 0)
          : [];
        if (commands.length === 0) {
          throw new Error('terminal_task requires payload.commands[]');
        }
        const timeoutRaw = payload.timeout_seconds;
        const timeoutSeconds =
          typeof timeoutRaw === 'number' && Number.isFinite(timeoutRaw)
            ? Math.max(1, Math.min(MAX_TIMEOUT_SECONDS, Math.floor(timeoutRaw)))
            : DEFAULT_TIMEOUT_SECONDS;

        const baseDir = resolve(
          process.env.OPSLY_TERMINAL_BASE_DIR ?? join(process.cwd(), 'runtime', 'agents')
        );
        const agentDir = resolve(baseDir, sanitizeAgentId(agentId));
        const cwd = typeof payload.cwd === 'string' && payload.cwd.trim().length > 0 ? payload.cwd : agentDir;

        await mkdir(agentDir, { recursive: true });
        startTerminalSession(agentId, tenantSlug, randomUUID(), cwd);

        for (const command of commands) {
          setSessionCommand(agentId, command);
          await runCommand(agentId, command, cwd, timeoutSeconds);
          setSessionChild(agentId, undefined);
        }

        completeTerminalSession(agentId, 0);
        logWorkerLifecycle('complete', 'terminal', job, {
          duration_ms: Date.now() - t0,
        });

        return {
          success: true,
          agent_id: agentId,
          tenant_slug: tenantSlug,
          cwd,
          commands_executed: commands.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const data = job.data as TerminalTaskJobData;
        const payload = data.payload ?? {};
        const rawAgentId = typeof payload.agent_id === 'string' ? payload.agent_id.trim() : '';
        if (rawAgentId.length > 0) {
          failTerminalSession(rawAgentId, message);
        }
        logWorkerLifecycle('fail', 'terminal', job, {
          duration_ms: Date.now() - t0,
          error: message,
        });
        throw error;
      }
    },
    { connection, concurrency }
  );
}
