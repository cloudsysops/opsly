import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { Job } from 'bullmq';
import { createWorker } from './create-worker.js';
import {
  appendSessionOutput,
  completeTerminalSession,
  failTerminalSession,
  incrementSessionCommandCount,
  setSessionChild,
  setSessionCommand,
  startTerminalSession,
} from './terminal-session-store.js';

interface TerminalTaskPayload {
  agent_id?: string;
  commands?: unknown;
  tenant_slug?: string;
  session_id?: string;
  process_label?: string;
  objective?: string;
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

function extractString(value: unknown, defaultValue: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : defaultValue;
}

function extractTimeout(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.min(MAX_TIMEOUT_SECONDS, Math.floor(value)));
  }
  return DEFAULT_TIMEOUT_SECONDS;
}

function validatePayload(
  payload: TerminalTaskPayload,
  baseAgentDir: string
): {
  agentId: string;
  sessionId: string;
  commands: string[];
  timeoutSeconds: number;
  cwd: string;
  processLabel?: string;
  objective?: string;
} {
  const agentId = extractString(payload.agent_id, `agent-${randomUUID()}`);
  const sessionId = extractString(payload.session_id, randomUUID());
  const commands = isStringArray(payload.commands)
    ? payload.commands.map((c) => c.trim()).filter((c) => c.length > 0)
    : [];
  if (commands.length === 0) {
    throw new Error('terminal_task requires payload.commands[]');
  }
  const timeoutSeconds = extractTimeout(payload.timeout_seconds);
  const cwd = extractString(payload.cwd, baseAgentDir);
  const processLabel = extractString(payload.process_label, '') || undefined;
  const objective = extractString(payload.objective, '') || undefined;

  return { agentId, sessionId, commands, timeoutSeconds, cwd, processLabel, objective };
}

function runCommand(
  agentId: string,
  sessionId: string,
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

    setSessionChild(agentId, child, sessionId);
    child.stdout.on('data', (chunk: Buffer) =>
      appendSessionOutput(agentId, chunk.toString(), sessionId)
    );
    child.stderr.on('data', (chunk: Buffer) =>
      appendSessionOutput(agentId, chunk.toString(), sessionId)
    );

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

async function processTerminalJob(job: Job) {
  const data = job.data as TerminalTaskJobData;
  const payload = data.payload ?? {};
  const tenantSlug = extractString(payload.tenant_slug, data.tenant_slug ?? 'opsly-internal');

  const baseDir = resolve(
    process.env.OPSLY_TERMINAL_BASE_DIR ?? join(process.cwd(), 'runtime', 'agents')
  );
  const defaultAgentDir = resolve(
    baseDir,
    sanitizeAgentId(
      typeof payload.agent_id === 'string' ? payload.agent_id.trim() : `agent-${randomUUID()}`
    )
  );

  const { agentId, sessionId, commands, timeoutSeconds, cwd, processLabel, objective } =
    validatePayload(payload, defaultAgentDir);

  const agentDir = resolve(baseDir, sanitizeAgentId(agentId));
  await mkdir(agentDir, { recursive: true });
  startTerminalSession(agentId, tenantSlug, sessionId, cwd, processLabel, objective);

  try {
    for (const command of commands) {
      setSessionCommand(agentId, command, sessionId);
      await runCommand(agentId, sessionId, command, cwd, timeoutSeconds);
      incrementSessionCommandCount(agentId, sessionId);
      setSessionChild(agentId, undefined, sessionId);
    }

    completeTerminalSession(agentId, 0, sessionId);

    return {
      success: true,
      agent_id: agentId,
      session_id: sessionId,
      tenant_slug: tenantSlug,
      cwd,
      commands_executed: commands.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const rawAgentId = typeof payload.agent_id === 'string' ? payload.agent_id.trim() : '';
    if (rawAgentId.length > 0) {
      failTerminalSession(rawAgentId, message, sessionId);
    }
    throw error;
  }
}

export function startTerminalWorker(connection: object) {
  return createWorker({
    jobName: 'terminal_task',
    workerName: 'terminal',
    concurrencyKey: 'terminal',
    connection,
    processFn: processTerminalJob,
  });
}
