import { describe, expect, it } from 'vitest';
import { invokeOpsAgent } from '../ops-agent.js';

describe('invokeOpsAgent', () => {
  it('maps gateway JSON into OpsAgentOutput', async () => {
    const out = await invokeOpsAgent({
      input: {
        bookingId: 'b1',
        tenantId: 't1',
        serviceType: 'gaming-optimization',
        findings: 'dusty GPU',
        actionsPerformed: 'cleaned',
        metricsBeforeAfter: { before: { fps: 40 }, after: { fps: 90 } },
        customerSatisfaction: 5,
      },
      tenantSlug: 'cloudsysops-tech',
      requestId: 'req-ops-1',
      meterTokens: false,
      client: {
        async complete() {
          return JSON.stringify({
            reportContent: {
              findings: 'GPU dust',
              actions: 'deep clean',
              results: 'fps 40→90',
              recommendations: 'annual plan',
            },
            upsellSuggestion: 'SSD $150',
            followUpSchedule: {
              thirtyDays: 'check-in',
              sixtyDays: 'upsell',
              ninetyDays: 'maintenance',
            },
            nextMaintenanceDate: '2026-12-01',
          });
        },
      },
    });
    expect(out.reportContent.findings).toBe('GPU dust');
    expect(out.nextMaintenanceDate).toBe('2026-12-01');
  });
});
