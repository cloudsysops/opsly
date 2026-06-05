import { beforeEach, describe, expect, it, vi } from 'vitest';

const persistPeskidsLeadMock = vi.fn();
const dispatchPeskidsLeadAutomationMock = vi.fn();

vi.mock('../../../../../../../../../lib/peskids/lead-ingest', () => ({
  persistPeskidsLead: persistPeskidsLeadMock,
  buildPeskidsLeadPersistInputFromGoHighLevel: vi.fn((payload) => ({
    tenantSlug: payload.tenant_slug,
    leadId: payload.lead_id,
    source: payload.source,
    stage: 'New Lead',
    createdAt: payload.occurred_at,
    parentName: payload.lead.parent_name,
    phone: payload.lead.phone,
    email: payload.lead.email,
    childName: payload.lead.child_name,
    age: payload.lead.age,
    interest: payload.lead.interest,
    eventId: payload.event_id,
    automationReady: true,
  })),
}));

vi.mock('../../../../../../../../../lib/peskids/automation', () => ({
  dispatchPeskidsLeadAutomation: dispatchPeskidsLeadAutomationMock,
}));

describe('POST /api/public/tenants/peskids/webhooks/gohighlevel/leads', () => {
  beforeEach(() => {
    persistPeskidsLeadMock.mockReset();
    dispatchPeskidsLeadAutomationMock.mockReset();
  });

  it('validates, persists, and returns the canonical response', async () => {
    persistPeskidsLeadMock.mockResolvedValue({
      ok: true,
      created: true,
      row: {
        id: 'row-1',
        tenant_slug: 'peskids',
        lead_id: 'lead-1',
        source: 'gohighlevel',
        stage: 'Trial Class',
        created_at: '2026-06-01T10:00:00.000Z',
      },
    });
    dispatchPeskidsLeadAutomationMock.mockResolvedValue({ ok: true, detail: 'queued in n8n' });

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-ghl-1' }),
      json: async () => ({
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
      }),
    } as never);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      lead_id: 'lead-1',
      tenant_slug: 'peskids',
      source: 'gohighlevel',
      stage: 'Trial Class',
      event_type: 'lead.created',
      created_at: '2026-06-01T10:00:00.000Z',
      automation_ready: true,
      automation: {
        next_actions: ['welcome_message', 'reminder', 'trial_class_invitation'],
        dispatch: true,
      },
      request_id: 'req-ghl-1',
    });
    expect(persistPeskidsLeadMock).toHaveBeenCalled();
    expect(dispatchPeskidsLeadAutomationMock).toHaveBeenCalledWith(
      expect.objectContaining({ lead_id: 'lead-1' })
    );
  });

  it('rejects requests with invalid webhook secret', async () => {
    process.env.PESKIDS_INBOUND_WEBHOOK_SECRET = 's3cret';
    persistPeskidsLeadMock.mockResolvedValue({
      ok: true,
      created: true,
      row: {
        id: 'row-1',
        tenant_slug: 'peskids',
        lead_id: 'lead-1',
        source: 'gohighlevel',
        stage: 'New Lead',
        created_at: '2026-06-01T10:00:00.000Z',
      },
    });

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({
        'x-request-id': 'req-ghl-3',
        'x-webhook-secret': 'wr0ng',
      }),
      json: async () => ({
        event_id: 'evt-1',
        event_type: 'lead.created',
        tenant_slug: 'peskids',
        source: 'gohighlevel',
        lead_id: 'lead-1',
        pipeline_stage: 'New Lead',
        occurred_at: '2026-06-01T10:00:00.000Z',
        lead: {
          parent_name: 'Maria Rodriguez',
          phone: '+573001112233',
          email: 'maria@example.com',
          child_name: 'Mateo',
          age: 8,
          interest: 'Trial class',
        },
      }),
    } as never);

    expect(response.status).toBe(401);
    expect(persistPeskidsLeadMock).not.toHaveBeenCalled();
    delete process.env.PESKIDS_INBOUND_WEBHOOK_SECRET;
  });

  it('returns dispatch=false for duplicate leads', async () => {
    persistPeskidsLeadMock.mockResolvedValue({
      ok: true,
      created: false,
      row: {
        id: 'row-1',
        tenant_slug: 'peskids',
        lead_id: 'lead-1',
        source: 'gohighlevel',
        stage: 'New Lead',
        created_at: '2026-06-01T10:00:00.000Z',
      },
    });

    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-ghl-4' }),
      json: async () => ({
        event_id: 'evt-1',
        event_type: 'lead.created',
        tenant_slug: 'peskids',
        source: 'gohighlevel',
        lead_id: 'lead-1',
        pipeline_stage: 'New Lead',
        occurred_at: '2026-06-01T10:00:00.000Z',
        lead: {
          parent_name: 'Maria Rodriguez',
          phone: '+573001112233',
          email: 'maria@example.com',
          child_name: 'Mateo',
          age: 8,
          interest: 'Trial class',
        },
      }),
    } as never);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.automation.dispatch).toBe(false);
    expect(dispatchPeskidsLeadAutomationMock).not.toHaveBeenCalled();
  });

  it('rejects invalid webhook payloads', async () => {
    const { POST } = await import('../route');
    const response = await POST({
      headers: new Headers({ 'x-request-id': 'req-ghl-2' }),
      json: async () => ({
        event_id: 'evt-1',
        event_type: 'lead.created',
        tenant_slug: 'peskids',
        source: 'gohighlevel',
        lead_id: 'lead-1',
        pipeline_stage: 'Trial Class',
        occurred_at: 'not-a-date',
        lead: {
          parent_name: 'Maria Rodriguez',
          phone: '+573001112233',
          email: 'maria@example.com',
          child_name: 'Mateo',
          age: 8,
          interest: 'Trial class',
        },
      }),
    } as never);

    expect(response.status).toBe(400);
    expect(persistPeskidsLeadMock).not.toHaveBeenCalled();
  });
});
