import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  appendSessionOutput,
  completeTerminalSession,
  getTerminalSession,
  incrementSessionCommandCount,
  listTerminalSessions,
  readTerminalSessionOutput,
  startTerminalSession,
  stopTerminalSession,
} from '../workers/terminal-session-store.js';

describe('terminal-session-store', () => {
  it('keeps multiple sessions per agent and supports incremental output', () => {
    const agentId = `agent-${randomUUID()}`;
    startTerminalSession(agentId, 'tenant-a', 'session-a', '/tmp', 'plan', 'first objective');
    startTerminalSession(agentId, 'tenant-a', 'session-b', '/tmp', 'verify', 'second objective');

    appendSessionOutput(agentId, 'hello ', 'session-a');
    appendSessionOutput(agentId, 'world', 'session-a');
    incrementSessionCommandCount(agentId, 'session-a');
    completeTerminalSession(agentId, 0, 'session-a');

    const sessions = listTerminalSessions(agentId);
    expect(sessions).toHaveLength(2);
    expect(getTerminalSession(agentId, 'session-a')?.commands_executed).toBe(1);
    expect(readTerminalSessionOutput(agentId, 'session-a', 6)).toEqual({
      output: 'world',
      next_offset: 11,
      total_length: 11,
    });
  });

  it('stops a specific session without mutating sibling sessions', () => {
    const agentId = `agent-${randomUUID()}`;
    startTerminalSession(agentId, 'tenant-a', 'session-a', '/tmp');
    startTerminalSession(agentId, 'tenant-a', 'session-b', '/tmp');

    expect(stopTerminalSession(agentId, 'session-a')).toEqual({ success: true });
    expect(getTerminalSession(agentId, 'session-a')?.status).toBe('stopped');
    expect(getTerminalSession(agentId, 'session-b')?.status).toBe('running');
  });
});
