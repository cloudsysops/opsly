import type { ChildProcess } from 'node:child_process';

export type TerminalSessionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'stopped';

export interface TerminalSessionRecord {
  agent_id: string;
  tenant_slug: string;
  session_id: string;
  process_label?: string;
  objective?: string;
  status: TerminalSessionStatus;
  cwd: string;
  current_command?: string;
  started_at: string;
  ended_at?: string;
  exit_code?: number | null;
  error?: string;
  output: string;
  pid?: number;
  commands_executed: number;
  retries: number;
}

interface SessionRuntime {
  record: TerminalSessionRecord;
  child?: ChildProcess;
}

const MAX_OUTPUT_CHARS = 20_000;
const sessions = new Map<string, Map<string, SessionRuntime>>();
const latestSessionByAgent = new Map<string, string>();

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
  cwd: string,
  processLabel?: string,
  objective?: string
): TerminalSessionRecord {
  const record: TerminalSessionRecord = {
    agent_id: agentId,
    tenant_slug: tenantSlug,
    session_id: sessionId,
    process_label: processLabel,
    objective,
    status: 'running',
    cwd,
    started_at: new Date().toISOString(),
    output: '',
    commands_executed: 0,
    retries: 0,
  };
  const agentSessions = sessions.get(agentId) ?? new Map<string, SessionRuntime>();
  agentSessions.set(sessionId, { record });
  sessions.set(agentId, agentSessions);
  latestSessionByAgent.set(agentId, sessionId);
  return record;
}

function getSessionRuntime(agentId: string, sessionId?: string): SessionRuntime | undefined {
  const agentSessions = sessions.get(agentId);
  if (!agentSessions) return undefined;
  const resolvedSessionId = sessionId ?? latestSessionByAgent.get(agentId);
  if (!resolvedSessionId) return undefined;
  return agentSessions.get(resolvedSessionId);
}

export function setSessionChild(agentId: string, child?: ChildProcess, sessionId?: string): void {
  const runtime = getSessionRuntime(agentId, sessionId);
  if (!runtime) return;
  runtime.child = child;
  runtime.record.pid = child?.pid;
}

export function setSessionCommand(agentId: string, command: string, sessionId?: string): void {
  const runtime = getSessionRuntime(agentId, sessionId);
  if (!runtime) return;
  runtime.record.current_command = command;
}

export function appendSessionOutput(agentId: string, chunk: string, sessionId?: string): void {
  const runtime = getSessionRuntime(agentId, sessionId);
  if (!runtime || chunk.length === 0) return;
  runtime.record.output = trimOutput(`${runtime.record.output}${chunk}`);
}

export function incrementSessionCommandCount(agentId: string, sessionId?: string): void {
  const runtime = getSessionRuntime(agentId, sessionId);
  if (!runtime) return;
  runtime.record.commands_executed += 1;
}

export function completeTerminalSession(agentId: string, exitCode?: number | null, sessionId?: string): void {
  const runtime = getSessionRuntime(agentId, sessionId);
  if (!runtime) return;
  runtime.record.status = 'completed';
  runtime.record.exit_code = exitCode ?? 0;
  runtime.record.ended_at = new Date().toISOString();
  runtime.record.current_command = undefined;
  runtime.child = undefined;
}

export function failTerminalSession(agentId: string, error: string, sessionId?: string): void {
  const runtime = getSessionRuntime(agentId, sessionId);
  if (!runtime) return;
  runtime.record.status = 'failed';
  runtime.record.error = error;
  runtime.record.ended_at = new Date().toISOString();
  runtime.record.current_command = undefined;
  runtime.child = undefined;
}

export function stopTerminalSession(agentId: string, sessionId?: string): { success: boolean; reason?: string } {
  const runtime = getSessionRuntime(agentId, sessionId);
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

export function getTerminalSession(agentId: string, sessionId?: string): TerminalSessionRecord | null {
  return getSessionRuntime(agentId, sessionId)?.record ?? null;
}

export function listTerminalSessions(agentId: string): TerminalSessionRecord[] {
  const agentSessions = sessions.get(agentId);
  if (!agentSessions) return [];
  return Array.from(agentSessions.values())
    .map((runtime) => runtime.record)
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
}

export function readTerminalSessionOutput(
  agentId: string,
  sessionId: string,
  offset: number
): { output: string; next_offset: number; total_length: number } | null {
  const record = getTerminalSession(agentId, sessionId);
  if (!record) return null;
  const safeOffset = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  return {
    output: record.output.slice(safeOffset),
    next_offset: record.output.length,
    total_length: record.output.length,
  };
}
