import type { ChildProcess } from 'node:child_process';

export type TerminalSessionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'stopped';

export interface TerminalSessionRecord {
  agent_id: string;
  tenant_slug: string;
  session_id: string;
  status: TerminalSessionStatus;
  cwd: string;
  current_command?: string;
  started_at: string;
  ended_at?: string;
  exit_code?: number | null;
  error?: string;
  output: string;
  pid?: number;
}

interface SessionRuntime {
  record: TerminalSessionRecord;
  child?: ChildProcess;
}

const MAX_OUTPUT_CHARS = 20_000;
const sessions = new Map<string, SessionRuntime>();

function trimOutput(output: string): string {
  if (output.length <= MAX_OUTPUT_CHARS) {
    return output;
  }
  return output.slice(output.length - MAX_OUTPUT_CHARS);
}

export function startTerminalSession(
  agentId: string,
  tenantSlug: string,
  sessionId: string,
  cwd: string
): TerminalSessionRecord {
  const record: TerminalSessionRecord = {
    agent_id: agentId,
    tenant_slug: tenantSlug,
    session_id: sessionId,
    status: 'running',
    cwd,
    started_at: new Date().toISOString(),
    output: '',
  };
  sessions.set(agentId, { record });
  return record;
}

export function setSessionChild(agentId: string, child?: ChildProcess): void {
  const runtime = sessions.get(agentId);
  if (!runtime) return;
  runtime.child = child;
  runtime.record.pid = child?.pid;
}

export function setSessionCommand(agentId: string, command: string): void {
  const runtime = sessions.get(agentId);
  if (!runtime) return;
  runtime.record.current_command = command;
}

export function appendSessionOutput(agentId: string, chunk: string): void {
  const runtime = sessions.get(agentId);
  if (!runtime || chunk.length === 0) return;
  runtime.record.output = trimOutput(`${runtime.record.output}${chunk}`);
}

export function completeTerminalSession(agentId: string, exitCode?: number | null): void {
  const runtime = sessions.get(agentId);
  if (!runtime) return;
  runtime.record.status = 'completed';
  runtime.record.exit_code = exitCode ?? 0;
  runtime.record.ended_at = new Date().toISOString();
  runtime.record.current_command = undefined;
  runtime.child = undefined;
}

export function failTerminalSession(agentId: string, error: string): void {
  const runtime = sessions.get(agentId);
  if (!runtime) return;
  runtime.record.status = 'failed';
  runtime.record.error = error;
  runtime.record.ended_at = new Date().toISOString();
  runtime.record.current_command = undefined;
  runtime.child = undefined;
}

export function stopTerminalSession(agentId: string): { success: boolean; reason?: string } {
  const runtime = sessions.get(agentId);
  if (!runtime) {
    return { success: false, reason: 'session_not_found' };
  }
  if (runtime.child) {
    runtime.child.kill('SIGTERM');
  }
  runtime.record.status = 'stopped';
  runtime.record.ended_at = new Date().toISOString();
  runtime.record.current_command = undefined;
  runtime.child = undefined;
  return { success: true };
}

export function getTerminalSession(agentId: string): TerminalSessionRecord | null {
  return sessions.get(agentId)?.record ?? null;
}
