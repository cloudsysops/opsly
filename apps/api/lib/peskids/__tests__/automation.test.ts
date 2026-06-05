import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { dispatchPeskidsLeadAutomation, PESKIDS_N8N_LEAD_INTAKE_PATH } from '../automation';

describe('peskids automation dispatch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.N8N_WEBHOOK_BASE_URL;
  });

  it('uses the canonical n8n lead intake path', () => {
    expect(PESKIDS_N8N_LEAD_INTAKE_PATH).toBe('/peskids-lead-intake');
  });

  it('returns graceful failure when N8N_WEBHOOK_BASE_URL is missing', async () => {
    const result = await dispatchPeskidsLeadAutomation({
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
    });

    expect(result).toEqual({ ok: false, detail: 'N8N_WEBHOOK_BASE_URL not configured' });
  });

  it('posts the automation envelope to the n8n webhook base URL', async () => {
    process.env.N8N_WEBHOOK_BASE_URL = 'https://n8n-peskids.op-sly.com/webhook';
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response('{}', { status: 202 }));

    const result = await dispatchPeskidsLeadAutomation({
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
      automation: {
        welcome_message: true,
        reminder: true,
        trial_class_invitation: true,
      },
    });

    expect(result).toEqual({ ok: true, detail: 'queued in n8n' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://n8n-peskids.op-sly.com/webhook/peskids-lead-intake',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      tenant_slug: 'peskids',
      lead_id: 'lead-1',
      event_id: 'evt-1',
      stage: 'New Lead',
      next_actions: ['welcome_message', 'reminder', 'trial_class_invitation'],
    });
  });
});
