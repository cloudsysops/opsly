import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { resolvePeskidsInternalSecret, verifyPeskidsInternalRequest } from '../internal-auth';

const SECRET_KEYS = [
  'PESKIDS_INTERNAL_SECRET',
  'PESKIDS_INTERNAL_API_SECRET',
  'PESKIDS_INBOUND_WEBHOOK_SECRET',
  'JELOU_WEBHOOK_SECRET',
] as const;

function clearSecrets(): void {
  for (const key of SECRET_KEYS) {
    delete process.env[key];
  }
}

function requestWithHeader(headerName: string, value: string): NextRequest {
  return new NextRequest('http://127.0.0.1/api/internal', {
    headers: { [headerName]: value },
  });
}

describe('peskids internal-auth', () => {
  afterEach(() => {
    clearSecrets();
  });

  it('prefers PESKIDS_INTERNAL_SECRET over aliases', () => {
    process.env.JELOU_WEBHOOK_SECRET = 'jelou';
    process.env.PESKIDS_INTERNAL_SECRET = 'canonical';
    expect(resolvePeskidsInternalSecret()).toBe('canonical');
  });

  it('accepts the inbound webhook alias when the canonical secret is unset', () => {
    process.env.PESKIDS_INBOUND_WEBHOOK_SECRET = 'inbound';
    expect(resolvePeskidsInternalSecret()).toBe('inbound');
  });

  it('fails closed when no secret is configured', () => {
    clearSecrets();
    expect(verifyPeskidsInternalRequest(requestWithHeader('x-internal-secret', 'anything'))).toBe(
      false
    );
  });

  it('rejects a mismatched header', () => {
    process.env.PESKIDS_INTERNAL_SECRET = 'expected-secret';
    expect(verifyPeskidsInternalRequest(requestWithHeader('x-internal-secret', 'wrong'))).toBe(
      false
    );
  });

  it('accepts a matching x-internal-secret', () => {
    process.env.PESKIDS_INTERNAL_SECRET = 'expected-secret';
    expect(
      verifyPeskidsInternalRequest(requestWithHeader('x-internal-secret', 'expected-secret'))
    ).toBe(true);
  });

  it('accepts x-webhook-secret as an alias header', () => {
    process.env.PESKIDS_INTERNAL_SECRET = 'expected-secret';
    expect(
      verifyPeskidsInternalRequest(requestWithHeader('x-webhook-secret', 'expected-secret'))
    ).toBe(true);
  });
});
