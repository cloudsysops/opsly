import { describe, expect, it } from 'vitest';
import {
  allowLegacyLocalAgentPayload,
  localAgentExecuteHeaders,
  mapLocalAgentBridgeFailure,
  sanitizeLocalAgentError,
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

describe('mapLocalAgentBridgeFailure', () => {
  it('maps missing prompt to unrecoverable VALIDATION_ERROR', () => {
    const mapped = mapLocalAgentBridgeFailure('opencode', 400, {
      errorCode: 'VALIDATION_ERROR',
      error: 'prompt_content is required',
    });
    expect(mapped.unrecoverable).toBe(true);
    expect(mapped.errorCode).toBe('VALIDATION_ERROR');
    expect(mapped.message).toContain('prompt_content is required');
  });

  it('maps ENOENT-style 503 to unrecoverable AGENT_BINARY_NOT_FOUND', () => {
    const mapped = mapLocalAgentBridgeFailure('opencode', 503, {
      errorCode: 'AGENT_BINARY_NOT_FOUND',
      error: 'agent binary not found in PATH',
    });
    expect(mapped.unrecoverable).toBe(true);
    expect(mapped.errorCode).toBe('AGENT_BINARY_NOT_FOUND');
  });

  it('keeps generic 500 recoverable so the job can fail closed', () => {
    const mapped = mapLocalAgentBridgeFailure('opencode', 500, {
      error: 'AGENT_EXIT_NONZERO',
    });
    expect(mapped.unrecoverable).toBe(false);
    expect(mapped.errorCode).toBe('BRIDGE_HTTP_ERROR');
  });
});

describe('sanitizeLocalAgentError', () => {
  it('redacts bearer tokens and api keys', () => {
    expect(sanitizeLocalAgentError('Bearer abcdef.secret token=supersecret')).toContain('Bearer ***');
    expect(sanitizeLocalAgentError('token=supersecret')).toContain('token=***');
    expect(sanitizeLocalAgentError('sk-abcdefghijklmnopqrstuvwxyz')).toContain('sk-***');
  });
});


describe('allowLegacyLocalAgentPayload', () => {
  it('fails closed by default', () => {
    expect(allowLegacyLocalAgentPayload({})).toBe(false);
  });

  it('requires an explicit transition override', () => {
    expect(allowLegacyLocalAgentPayload({ OPSLY_ALLOW_LEGACY_LOCAL_AGENT_PAYLOAD: 'true' })).toBe(true);
    expect(allowLegacyLocalAgentPayload({ OPSLY_ALLOW_LEGACY_LOCAL_AGENT_PAYLOAD: '1' })).toBe(false);
  });
});
