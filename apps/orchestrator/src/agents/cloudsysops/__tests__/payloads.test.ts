import { describe, expect, it } from 'vitest';
import { parseOpsAgentPayload, parseSalesAgentPayload } from '../payloads.js';

describe('parseSalesAgentPayload', () => {
  it('returns null when required fields missing', () => {
    expect(parseSalesAgentPayload({ message: 'hi' })).toBeNull();
  });

  it('parses minimal valid payload', () => {
    const p = parseSalesAgentPayload({
      message: 'PC slow',
      customer_id: 'c1',
      tenant_id: 't1',
    });
    expect(p).toEqual({
      message: 'PC slow',
      customerId: 'c1',
      tenantId: 't1',
      conversationHistory: [],
      contextBlock: undefined,
    });
  });
});

describe('parseOpsAgentPayload', () => {
  it('returns null when metrics invalid', () => {
    expect(
      parseOpsAgentPayload({
        booking_id: 'b1',
        tenant_id: 't1',
        service_type: 'pc-cleanup',
        findings: 'dust',
        actions_performed: 'cleaned',
        customer_satisfaction: 5,
        metrics_before_after: { before: 1, after: 2 },
      })
    ).toBeNull();
  });

  it('parses valid ops payload', () => {
    const p = parseOpsAgentPayload({
      booking_id: 'b1',
      tenant_id: 't1',
      service_type: 'pc-cleanup',
      findings: 'dust',
      actions_performed: 'cleaned',
      customer_satisfaction: 4,
      metrics_before_after: {
        before: { temp_c: 90 },
        after: { temp_c: 55 },
      },
    });
    expect(p?.bookingId).toBe('b1');
    expect(p?.metricsBeforeAfter.before).toEqual({ temp_c: 90 });
  });
});
