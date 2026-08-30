import { describe, expect, it } from 'vitest';
import {
  localAgentExecuteHeaders,
  shouldWaitForAcceptedResponse,
} from '../workers/local-agent-http-worker.js';

describe('localAgentExecuteHeaders', () => {
  it('sends only content-type when no token is set', () => {
    expect(localAgentExecuteHeaders({})).toEqual({ 'Content-Type': 'application/json' });
  });

  it('forwards OPSLY_CLI_AGENT_TOKEN as Bearer', () => {
    expect(localAgentExecuteHeaders({ OPSLY_CLI_AGENT_TOKEN: 'abc123' })).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc123',
    });
  });

  it('falls back to OPSLY_OPENCODE_AGENT_TOKEN', () => {
    expect(localAgentExecuteHeaders({ OPSLY_OPENCODE_AGENT_TOKEN: 'xyz' }).Authorization).toBe(
      'Bearer xyz'
    );
  });
});

describe('shouldWaitForAcceptedResponse', () => {
  it('waits when the bridge ACKs without a response file', () => {
    expect(shouldWaitForAcceptedResponse({ accepted: true, success: true })).toBe(true);
  });

  it('does not wait when a response_path is already present', () => {
    expect(
      shouldWaitForAcceptedResponse({
        accepted: true,
        response_path: '/tmp/response.md',
      })
    ).toBe(false);
  });

  it('does not treat a sync execute as accepted', () => {
    expect(shouldWaitForAcceptedResponse({ success: true, content: 'done' })).toBe(false);
  });
});
