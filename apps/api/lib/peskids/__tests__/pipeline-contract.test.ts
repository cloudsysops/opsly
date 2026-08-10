import { describe, expect, it } from 'vitest';
import {
  buildPeskidsAutomationPayload,
  normalizePeskidsPipelineStage,
  peskidsLeadAutomationEventSchema,
} from '../pipeline-contract';

describe('pipeline-contract', () => {
  it('normalizes stages', () => {
    expect(normalizePeskidsPipelineStage('trial')).toBe('Trial Class');
    expect(normalizePeskidsPipelineStage('new')).toBe('New Lead');
  });

  it('builds automation payload', () => {
    const event = peskidsLeadAutomationEventSchema.parse({
      event_id: 'evt-1',
      event_type: 'lead.created',
      tenant_slug: 'peskids',
      source: 'web',
      lead_id: 'lead-1',
      pipeline_stage: 'New Lead',
      occurred_at: new Date().toISOString(),
      lead: {
        parent_name: 'Ana',
        phone: '+573001112233',
        email: 'ana@example.com',
        child_name: 'Luis',
        age: 8,
        interest: 'natacion',
      },
    });
    const payload = buildPeskidsAutomationPayload(event);
    expect(payload.lead_id).toBe('lead-1');
    expect(payload.stage).toBe('New Lead');
  });
});
