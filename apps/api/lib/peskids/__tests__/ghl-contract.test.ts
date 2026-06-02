import { describe, expect, it } from 'vitest';
import {
  buildPeskidsAutomationPayload,
  goHighLevelLeadWebhookSchema,
  leadStatusFromPipelineStage,
  normalizePeskidsPipelineStage,
} from '../ghl-contract';

describe('ghl-contract', () => {
  it('normalizes pipeline stages to the canonical six-stage model', () => {
    expect(normalizePeskidsPipelineStage('trial')).toBe('Trial Class');
    expect(normalizePeskidsPipelineStage('renewal')).toBe('Renewal');
    expect(normalizePeskidsPipelineStage('unknown')).toBe('New Lead');
  });

  it('maps pipeline stages to legacy dashboard statuses', () => {
    expect(leadStatusFromPipelineStage('New Lead')).toBe('new');
    expect(leadStatusFromPipelineStage('Contacted')).toBe('contacted');
    expect(leadStatusFromPipelineStage('Trial Class')).toBe('qualified');
    expect(leadStatusFromPipelineStage('Active Student')).toBe('converted');
  });

  it('validates the minimal GHL webhook payload', () => {
    const parsed = goHighLevelLeadWebhookSchema.parse({
      event_id: 'evt-1',
      event_type: 'lead.created',
      tenant_slug: 'peskids',
      source: 'gohighlevel',
      lead_id: 'lead-1',
      pipeline_stage: 'Trial Class',
      occurred_at: '2026-06-01T10:00:00.000Z',
      lead: {
        parent_name: 'Maria Rodriguez',
        phone: '+573001112233',
        email: 'maria@example.com',
        child_name: 'Mateo',
        age: 8,
        interest: 'Trial class',
      },
    });

    expect(parsed.lead.child_name).toBe('Mateo');
    expect(buildPeskidsAutomationPayload(parsed)).toMatchObject({
      tenant_slug: 'peskids',
      lead_id: 'lead-1',
      stage: 'Trial Class',
      next_actions: ['welcome_message', 'reminder', 'trial_class_invitation'],
    });
  });
});
