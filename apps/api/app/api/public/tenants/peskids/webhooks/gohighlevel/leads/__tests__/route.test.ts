import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const persistPeskidsLeadMock = vi.fn();
const dispatchPeskidsLeadAutomationMock = vi.fn();
const createPipelineOpportunityMock = vi.fn();

const buildPeskidsLeadPersistInputFromGoHighLevelMock = vi.fn((payload) => {
  const normalized = payload.pipeline_stage?.toString().toLowerCase().trim() ?? 'new lead';
  let stage = 'New Lead';
  if (normalized.includes('contacted')) stage = 'Contacted';
  else if (normalized.includes('trial')) stage = 'Trial Class';
  else if (normalized.includes('enrolled')) stage = 'Enrolled';
  else if (normalized.includes('active')) stage = 'Active Student';
  else if (normalized.includes('renewal')) stage = 'Renewal';
  else if (normalized.includes('lost')) stage = 'Lost';

  return {
    tenantSlug: payload.tenant_slug,
    leadId: payload.lead_id,
    source: payload.source,
    stage,
    createdAt: payload.occurred_at,
    parentName: payload.lead.parent_name,
    phone: payload.lead.phone,
    email: payload.lead.email,
    childName: payload.lead.child_name,
    age: payload.lead.age,
    interest: payload.lead.interest,
    eventId: payload.event_id,
    automationReady: true,
    ghlContactId: payload.ghl?.contact_id ?? null,
    ghlOpportunityId: payload.ghl?.opportunity_id ?? null,
    ghlPipelineId: payload.ghl?.pipeline_id ?? null,
    ghlStageId: payload.ghl?.stage_id ?? null,
  };
});

vi.mock('../../../../../../../../../lib/peskids/lead-ingest', () => ({
  persistPeskidsLead: persistPeskidsLeadMock,
  buildPeskidsLeadPersistInputFromGoHighLevel: buildPeskidsLeadPersistInputFromGoHighLevelMock,
}));

vi.mock('../../../../../../../../../lib/peskids/automation', () => ({
  dispatchPeskidsLeadAutomation: dispatchPeskidsLeadAutomationMock,
}));

vi.mock('../../../../../../../../lib/peskids/opportunity', () => ({
  createPipelineOpportunity: createPipelineOpportunityMock,
}));

function ghlRequest(
  body: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return new Request('http://localhost/api/public/tenants/peskids/webhooks/gohighlevel/leads', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

const validLeadBody = {
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
  ghl: {
    contact_id: 'contact-ghl-1',
  },
  automation: { welcome_message: true, reminder: true, trial_class_invitation: true },
};

describe('POST /api/public/tenants/peskids/webhooks/gohighlevel/leads', () => {
  beforeEach(() => {
    persistPeskidsLeadMock.mockReset();
    dispatchPeskidsLeadAutomationMock.mockReset();
    createPipelineOpportunityMock.mockReset();
    process.env.PESKIDS_INBOUND_WEBHOOK_SECRET = 's3cret';
  });

  it('returns 503 when webhook secret is not configured', async () => {
    delete process.env.PESKIDS_INBOUND_WEBHOOK_SECRET;
    const { POST } = await import('../route');
    const response = await POST(ghlRequest({}));
    expect(response.status).toBe(503);
    expect(persistPeskidsLeadMock).not.toHaveBeenCalled();
  });

  it('validates, persists, creates opportunity, and returns the canonical response', async () => {
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
        ghl_contact_id: 'contact-ghl-1',
      },
    });
    createPipelineOpportunityMock.mockResolvedValue({
      opportunityId: 'opp-ghl-1',
    });
    dispatchPeskidsLeadAutomationMock.mockResolvedValue({ ok: true, detail: 'queued in n8n' });

    const { POST } = await import('../route');
    const response = await POST(
      ghlRequest(validLeadBody, {
        'x-request-id': 'req-ghl-1',
        'x-webhook-secret': 's3cret',
      })
    );

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
    const response = await POST(
      ghlRequest(
        {
          ...validLeadBody,
          pipeline_stage: 'New Lead',
          automation: undefined,
          ghl: undefined,
        },
        {
          'x-request-id': 'req-ghl-3',
          'x-webhook-secret': 'wr0ng',
        }
      )
    );

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
    const response = await POST(
      ghlRequest(
        {
          ...validLeadBody,
          pipeline_stage: 'New Lead',
          automation: undefined,
          ghl: undefined,
        },
        {
          'x-request-id': 'req-ghl-4',
          'x-webhook-secret': 's3cret',
        }
      )
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.automation.dispatch).toBe(false);
    expect(dispatchPeskidsLeadAutomationMock).not.toHaveBeenCalled();
  });

  it('rejects invalid webhook payloads', async () => {
    const { POST } = await import('../route');
    const response = await POST(
      ghlRequest(
        {
          ...validLeadBody,
          occurred_at: 'not-a-date',
          automation: undefined,
          ghl: undefined,
        },
        {
          'x-request-id': 'req-ghl-2',
          'x-webhook-secret': 's3cret',
        }
      )
    );

    expect(response.status).toBe(400);
    expect(persistPeskidsLeadMock).not.toHaveBeenCalled();
  });

  it('skips opportunity creation when ghl_contact_id is missing', async () => {
    persistPeskidsLeadMock.mockResolvedValue({
      ok: true,
      created: true,
      row: {
        id: 'row-2',
        tenant_slug: 'peskids',
        lead_id: 'lead-2',
        source: 'gohighlevel',
        stage: 'New Lead',
        created_at: '2026-06-01T11:00:00.000Z',
        ghl_contact_id: null,
      },
    });
    dispatchPeskidsLeadAutomationMock.mockResolvedValue({ ok: true, detail: 'queued in n8n' });

    const { POST } = await import('../route');
    const response = await POST(
      ghlRequest(
        {
          event_id: 'evt-2',
          event_type: 'lead.created',
          tenant_slug: 'peskids',
          source: 'gohighlevel',
          lead_id: 'lead-2',
          pipeline_stage: 'New Lead',
          occurred_at: '2026-06-01T11:00:00.000Z',
          lead: {
            parent_name: 'Juan Perez',
            phone: '+573002224444',
            email: 'juan@example.com',
            child_name: 'Sofia',
            age: 6,
            interest: 'Trial class',
          },
          automation: { welcome_message: true, reminder: true, trial_class_invitation: true },
        },
        {
          'x-request-id': 'req-ghl-5',
          'x-webhook-secret': 's3cret',
        }
      )
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.automation.dispatch).toBe(true);
    expect(dispatchPeskidsLeadAutomationMock).toHaveBeenCalled();
  });
});
