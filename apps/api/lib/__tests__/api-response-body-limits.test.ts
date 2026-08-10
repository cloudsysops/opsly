import { describe, expect, it } from 'vitest';
import { parseJsonBody, readTextBodyLimited } from '../api-response';
import { HTTP_STATUS, REQUEST_BODY_LIMITS } from '../constants';

function jsonRequest(body: string, contentLength?: string): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (contentLength !== undefined) {
    headers.set('content-length', contentLength);
  }
  return new Request('http://localhost/test', {
    method: 'POST',
    headers,
    body,
  });
}

describe('request body limits', () => {
  it('parses valid JSON under the limit', async () => {
    const result = await parseJsonBody(jsonRequest('{"ok":true}'));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body).toEqual({ ok: true });
    }
  });

  it('rejects oversized Content-Length before reading', async () => {
    const result = await readTextBodyLimited(
      jsonRequest('{}', String(REQUEST_BODY_LIMITS.JSON_DEFAULT_BYTES + 1)),
      REQUEST_BODY_LIMITS.JSON_DEFAULT_BYTES
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(HTTP_STATUS.PAYLOAD_TOO_LARGE);
    }
  });

  it('rejects oversized buffers even without Content-Length', async () => {
    const huge = 'x'.repeat(REQUEST_BODY_LIMITS.JSON_DEFAULT_BYTES + 10);
    const result = await readTextBodyLimited(
      jsonRequest(huge),
      REQUEST_BODY_LIMITS.JSON_DEFAULT_BYTES
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(HTTP_STATUS.PAYLOAD_TOO_LARGE);
    }
  });
});
