import { describe, expect, it } from 'vitest';
import { getPeskidsShadowRuntime } from '../lib/peskids-shadow-runtime';

describe('Peskids shadow conversational runtime', () => {
  it('routes absence report in shadow without dispatch', async () => {
    const runtime = getPeskidsShadowRuntime();
    const response = await runtime.handle({
      tenantSlug: 'peskids',
      channel: 'whatsapp',
      sender: 'parent-demo',
      messageType: 'text',
      content: 'Mi hijo tiene fiebre y no va mañana a clase',
    });

    expect(response.ok).toBe(true);
    expect(response.intent).toBe('REPORT_ABSENCE');
    expect(response.runtime.event?.status).toBe('accepted');
    expect(response.reply).toMatch(/shadow|Recibido/i);
  });
});
