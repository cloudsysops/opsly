import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  isPeskidsGhlEnabledMock,
  verifySignatureMock,
  extractEventTypeMock,
  handlePipelineStageUpdateMock,
  handleContactCreatedMock,
  handleContactUpdatedMock,
} = vi.hoisted(() => ({
  isPeskidsGhlEnabledMock: vi.fn(),
  verifySignatureMock: vi.fn(),
  extractEventTypeMock: vi.fn(),
  handlePipelineStageUpdateMock: vi.fn(),
  handleContactCreatedMock: vi.fn(),
  handleContactUpdatedMock: vi.fn(),
}));

vi.mock('@intcloudsysops/services/twenty', () => ({
  isPeskidsGhlEnabled: isPeskidsGhlEnabledMock,
}));

vi.mock('@/lib/services/gohighlevel/webhook-auth', () => ({
  verifyGhlWebhookSignature: verifySignatureMock,
  extractGhlEventType: extractEventTypeMock,
}));

vi.mock('@/lib/services/gohighlevel/webhook-handler', () => ({
  handlePipelineStageUpdate: handlePipelineStageUpdateMock,
  handleContactCreated: handleContactCreatedMock,
  handleContactUpdated: handleContactUpdatedMock,
}));

import { POST } from '../route';

describe('POST /api/webhooks/gohighlevel', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns disabled without processing when PESKIDS_GHL_ENABLED=false', async () => {
    isPeskidsGhlEnabledMock.mockReturnValue(false);

    const request = new NextRequest('http://localhost/api/webhooks/gohighlevel', {
      method: 'POST',
      body: JSON.stringify({ type: 'contact.created' }),
      headers: { 'x-ghl-signature': 'sig' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('disabled');
    expect(verifySignatureMock).not.toHaveBeenCalled();
    expect(handleContactCreatedMock).not.toHaveBeenCalled();
  });

  it('verifies signature and dispatches when GHL legacy is enabled', async () => {
    isPeskidsGhlEnabledMock.mockReturnValue(true);
    verifySignatureMock.mockReturnValue(true);
    extractEventTypeMock.mockReturnValue('contact.created');
    handleContactCreatedMock.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/webhooks/gohighlevel', {
      method: 'POST',
      body: JSON.stringify({ type: 'contact.created', contactId: 'ghl-1' }),
      headers: { 'x-ghl-signature': 'valid-sig' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(verifySignatureMock).toHaveBeenCalled();
    expect(handleContactCreatedMock).toHaveBeenCalled();
  });
});
