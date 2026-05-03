import { describe, expect, it } from 'vitest';
import { invokeSalesAgent } from '../sales-agent.js';

describe('invokeSalesAgent', () => {
  it('parses structured JSON from gateway output', async () => {
    const out = await invokeSalesAgent({
      input: {
        message: 'slow laptop',
        customerId: 'c1',
        tenantId: 'tenant-product-1',
        conversationHistory: [],
      },
      tenantSlug: 'cloudsysops-tech',
      requestId: 'req-test-1',
      meterTokens: false,
      client: {
        async complete() {
          return JSON.stringify({
            response: 'We can do PC cleanup for $149.',
            intent: 'recommend',
            bookingData: {
              serviceType: 'pc-cleanup',
              suggestedPrice: 149,
              urgency: 'low',
            },
            nextAction: 'confirm slot',
          });
        },
      },
    });
    expect(out.intent).toBe('recommend');
    expect(out.bookingData?.serviceType).toBe('pc-cleanup');
    expect(out.response).toContain('149');
  });
});
