import { describe, expect, it } from 'vitest';
import {
  AI_BOARD_METRICS,
  assertFlagGovernance,
  buildLeadCreatedEvent,
  buildSupportWorkItem,
  canPromoteAutomationLevel,
  CONTACT_HOT_LEAD_ACCEPTANCE,
  customerFacingFlagsEnabled,
  denyExternalCustomerSend,
  ingestDomainEvent,
  mapDomainEventToSignals,
  mapSignalToBoardJob,
  PESKIDS_FLAG_REGISTRY,
  PESKIDS_SUPPORT_AUTOMATION_CAP,
  payloadContainsPii,
  unprovenCustomerWorkflows,
} from './index.js';

describe('ai-board mapping', () => {
  it('maps a hot lead.created event to SEND_ENROLLMENT_LINK at LEVEL 2', () => {
    const event = buildLeadCreatedEvent({
      tenantSlug: 'peskids',
      leadId: 'lead-1',
      hasPhone: true,
    });
    const result = ingestDomainEvent(event);
    expect(result.ok).toBe(true);
    expect(result.signals.map((row) => row.type)).toEqual(['HOT_LEAD_CREATED']);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]).toMatchObject({
      job_type: 'SEND_ENROLLMENT_LINK',
      priority: 'P1',
      owner_capability: 'peskids-support',
      automation_level: 2,
      execute_external: false,
      idempotency_key: 'peskids:SEND_ENROLLMENT_LINK:HOT_LEAD_CREATED:lead-1',
    });
    expect(result.jobs[0]?.acceptance).toEqual([...CONTACT_HOT_LEAD_ACCEPTANCE]);
  });

  it('does not emit a hot signal when the lead has no phone', () => {
    const result = ingestDomainEvent(
      buildLeadCreatedEvent({ tenantSlug: 'peskids', leadId: 'lead-2', hasPhone: false })
    );
    expect(result.ok).toBe(true);
    expect(result.signals).toEqual([]);
    expect(result.jobs).toEqual([]);
  });

  it('maps HOT_LEAD_UNATTENDED to a distinct SEND_ENROLLMENT_LINK job', () => {
    const result = ingestDomainEvent({
      event_type: 'followup.overdue',
      tenant_slug: 'peskids',
      data: { followup_id: 'fu-1', lead_id: 'lead-1', hot: true },
    });
    expect(result.signals[0]?.type).toBe('HOT_LEAD_UNATTENDED');
    expect(result.jobs[0]?.idempotency_key).toBe(
      'peskids:SEND_ENROLLMENT_LINK:HOT_LEAD_UNATTENDED:lead-1'
    );
    const created = ingestDomainEvent(
      buildLeadCreatedEvent({ tenantSlug: 'peskids', leadId: 'lead-1', hasPhone: true })
    );
    expect(created.jobs[0]?.idempotency_key).not.toBe(result.jobs[0]?.idempotency_key);
  });

  it('strips PII and still maps when canonical IDs remain', () => {
    const result = ingestDomainEvent({
      event_type: 'lead.created',
      tenant_slug: 'peskids',
      data: { lead_id: 'lead-1', email: 'parent@example.com', hot: true },
    });
    expect(result.ok).toBe(true);
    expect(result.jobs[0]?.entity_id).toBe('lead-1');
    expect(payloadContainsPii({ phone: '+57' })).toBe(true);
  });

  it('does not create duplicate jobs for the same condition', () => {
    const event = buildLeadCreatedEvent({
      tenantSlug: 'peskids',
      leadId: 'lead-9',
      hasPhone: true,
    });
    const first = ingestDomainEvent(event);
    const second = ingestDomainEvent(event);
    expect(first.jobs[0]?.idempotency_key).toBe(second.jobs[0]?.idempotency_key);
  });

  it('never auto-promotes Peskids support to LEVEL 4', () => {
    expect(PESKIDS_SUPPORT_AUTOMATION_CAP).toBe(2);
    expect(canPromoteAutomationLevel(2, 4)).toBe(false);
    expect(denyExternalCustomerSend(4)).toBe(true);
    expect(customerFacingFlagsEnabled()).toEqual([]);
    expect(unprovenCustomerWorkflows()).toEqual([]);
  });

  it('requires flag governance metadata and keeps customer sends off', () => {
    for (const record of PESKIDS_FLAG_REGISTRY) {
      expect(assertFlagGovernance(record)).toEqual([]);
      expect(record.rollback_switch.length).toBeGreaterThan(0);
    }
    const autoSend = PESKIDS_FLAG_REGISTRY.find(
      (row) => row.flag === 'PESKIDS_WHATSAPP_AUTO_SEND_ENABLED'
    );
    expect(autoSend?.current_state).toBe('off');
    expect(autoSend?.automation_level).toBe(4);
  });

  it('exposes closed-loop metrics for Board prioritization', () => {
    expect(AI_BOARD_METRICS).toEqual(
      expect.arrayContaining([
        'leads_received',
        'hot_leads',
        'drafts_generated',
        'messages_confirmed_sent',
        'automation_failures',
        'fallback_jobs',
      ])
    );
  });

  it('builds a one-decision support work item', () => {
    const job = mapSignalToBoardJob(
      mapDomainEventToSignals(
        buildLeadCreatedEvent({ tenantSlug: 'peskids', leadId: 'lead-1', hasPhone: true })
      )[0]!
    )!;
    const item = buildSupportWorkItem(job);
    expect(item.human_button).toBe('SEND ENROLLMENT LINK');
    expect(item.recommended_action).toBe('SEND_ENROLLMENT_LINK');
    expect(item.execute_external).toBe(false);
    expect(item.automation_level).toBe(2);
  });
});
