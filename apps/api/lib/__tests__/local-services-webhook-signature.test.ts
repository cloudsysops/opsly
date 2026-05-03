import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  localServicesWebhookSecretEnvKeyForSlug,
  resolveLocalServicesWebhookSecret,
  verifyLocalServicesWebhookSignature,
} from '../local-services-webhook-signature';

describe('verifyLocalServicesWebhookSignature', () => {
  it('accepts valid sha256= hex signature', () => {
    const secret = 'test-secret';
    const raw = '{"booking_id":"550e8400-e29b-41d4-a716-446655440000"}';
    const hex = createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
    expect(
      verifyLocalServicesWebhookSignature({
        rawBody: raw,
        signatureHeader: `sha256=${hex}`,
        secret,
      })
    ).toBe(true);
  });

  it('accepts raw 64-char hex without prefix', () => {
    const secret = 'x';
    const raw = '{}';
    const hex = createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
    expect(
      verifyLocalServicesWebhookSignature({
        rawBody: raw,
        signatureHeader: hex,
        secret,
      })
    ).toBe(true);
  });

  it('rejects wrong secret', () => {
    const raw = '{"a":1}';
    const hex = createHmac('sha256', 'a').update(raw, 'utf8').digest('hex');
    expect(
      verifyLocalServicesWebhookSignature({
        rawBody: raw,
        signatureHeader: `sha256=${hex}`,
        secret: 'b',
      })
    ).toBe(false);
  });

  it('rejects missing header', () => {
    expect(
      verifyLocalServicesWebhookSignature({
        rawBody: '{}',
        signatureHeader: null,
        secret: 's',
      })
    ).toBe(false);
  });

  it('rejects empty secret', () => {
    expect(
      verifyLocalServicesWebhookSignature({
        rawBody: '{}',
        signatureHeader: 'sha256=ab',
        secret: '',
      })
    ).toBe(false);
  });

  it('rejects malformed hex', () => {
    expect(
      verifyLocalServicesWebhookSignature({
        rawBody: '{}',
        signatureHeader: 'sha256=not-hex',
        secret: 's',
      })
    ).toBe(false);
  });
});

describe('resolveLocalServicesWebhookSecret', () => {
  it('prefers per-tenant env when set', () => {
    const key = localServicesWebhookSecretEnvKeyForSlug('acme-corp');
    process.env[key] = 'per-tenant-secret';
    process.env.LOCAL_SERVICES_WEBHOOK_SECRET = 'fallback';
    expect(resolveLocalServicesWebhookSecret('acme-corp')).toBe('per-tenant-secret');
    delete process.env[key];
    delete process.env.LOCAL_SERVICES_WEBHOOK_SECRET;
  });

  it('uses shared LOCAL_SERVICES_WEBHOOK_SECRET when per-tenant missing', () => {
    process.env.LOCAL_SERVICES_WEBHOOK_SECRET = 'shared';
    expect(resolveLocalServicesWebhookSecret('any-slug')).toBe('shared');
    delete process.env.LOCAL_SERVICES_WEBHOOK_SECRET;
  });
});
