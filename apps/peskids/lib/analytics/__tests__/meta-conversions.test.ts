import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendMetaLeadCapiEvent } from '@/lib/analytics/meta-conversions';

const baseInput = {
  eventId: 'req-123',
  email: 'ana@example.com',
  phone: '3001234567',
  sourceUrl: 'https://www.peskids.com/instagram',
  clientIp: '203.0.113.7',
  userAgent: 'test-agent',
};

describe('sendMetaLeadCapiEvent', () => {
  const originalEnv = { ...process.env };
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it('does nothing when the pixel ID is not configured', async () => {
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    process.env.META_CONVERSIONS_ACCESS_TOKEN = 'token';
    await sendMetaLeadCapiEvent(baseInput);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does nothing when the access token is not configured', async () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = 'pixel-1';
    delete process.env.META_CONVERSIONS_ACCESS_TOKEN;
    await sendMetaLeadCapiEvent(baseInput);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never throws when the Meta API request itself fails', async () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = 'pixel-1';
    process.env.META_CONVERSIONS_ACCESS_TOKEN = 'token';
    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(sendMetaLeadCapiEvent(baseInput)).resolves.toBeUndefined();
  });

  it('sends hashed PII, never the raw email or phone, once configured', async () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = 'pixel-1';
    process.env.META_CONVERSIONS_ACCESS_TOKEN = 'token';
    await sendMetaLeadCapiEvent(baseInput);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('pixel-1');
    expect(url).toContain('access_token=token');

    const body = JSON.parse(init.body as string);
    const userData = body.data[0].user_data;
    expect(userData.em[0]).not.toContain('ana@example.com');
    expect(userData.ph[0]).not.toContain('3001234567');
    expect(userData.em[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(userData.ph[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(body.data[0].event_id).toBe('req-123');
    expect(body.data[0].event_name).toBe('Lead');
  });

  it('includes the test_event_code only when configured', async () => {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = 'pixel-1';
    process.env.META_CONVERSIONS_ACCESS_TOKEN = 'token';
    process.env.META_CONVERSIONS_TEST_EVENT_CODE = 'TEST123';
    await sendMetaLeadCapiEvent(baseInput);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.test_event_code).toBe('TEST123');
  });
});
