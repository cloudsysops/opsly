import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardLead } from '@/lib/services/lead-admin.service';

const {
  getLeadForAdminMock,
  listFollowupsMock,
  listTrialClassesMock,
  decorateLeadWithCrmUrlsMock,
} = vi.hoisted(() => ({
  getLeadForAdminMock: vi.fn(),
  listFollowupsMock: vi.fn(),
  listTrialClassesMock: vi.fn(),
  decorateLeadWithCrmUrlsMock: vi.fn(),
}));

vi.mock('@/lib/services/lead-admin.service', () => ({
  getLeadForAdmin: getLeadForAdminMock,
}));

vi.mock('@/lib/services/followup-admin.service', () => ({
  listFollowups: listFollowupsMock,
}));

vi.mock('@/lib/services/trial-class.service', () => ({
  listTrialClasses: listTrialClassesMock,
}));

vi.mock('@/lib/services/dashboard.service', () => ({
  decorateLeadWithCrmUrls: decorateLeadWithCrmUrlsMock,
}));

import { getLead360 } from '@/lib/services/lead-360.service';

const baseLead: DashboardLead = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+573001112233',
  class_modality: 'llanogrande',
  neighborhood: 'Envigado',
  grade_interested: '5-7',
  status: 'new',
  admin_notes: 'Llamar en la mañana',
  referral_code: null,
  referred_by_code: null,
  referral_discount_cents: 0,
  referral_redemptions: 0,
  referral_source: 'instagram',
  created_at: '2026-07-21T10:00:00.000Z',
  twenty_person_id: 'person-1',
  twenty_opportunity_id: 'opp-1',
  twenty_person_url: null,
  twenty_opportunity_url: null,
  twenty_sync_status: 'synced',
};

describe('getLead360', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    decorateLeadWithCrmUrlsMock.mockImplementation((lead: DashboardLead) => ({
      ...lead,
      twenty_person_url: 'https://twenty.example/objects/people/person-1',
      twenty_opportunity_url: 'https://twenty.example/objects/opportunities/opp-1',
      twenty_sync_status: 'synced' as const,
    }));
  });

  it('returns null when lead is missing', async () => {
    getLeadForAdminMock.mockResolvedValue(null);

    const result = await getLead360(baseLead.id, 'peskids');

    expect(result).toBeNull();
    expect(listFollowupsMock).not.toHaveBeenCalled();
    expect(listTrialClassesMock).not.toHaveBeenCalled();
  });

  it('aggregates lead, followups, trials, aging badge and timeline', async () => {
    getLeadForAdminMock.mockResolvedValue(baseLead);
    listFollowupsMock.mockResolvedValue([
      {
        id: 'f1',
        tenant_id: 'peskids',
        contact_id: baseLead.id,
        contact_type: 'lead',
        type: 'call',
        due_date: '2026-07-22',
        status: 'pending',
        notes: null,
        created_at: '2026-07-22T08:00:00.000Z',
        updated_at: '2026-07-22T08:00:00.000Z',
        twenty_task_id: null,
        sync_status: null,
        sync_error: null,
        retry_count: 0,
        contact_name: baseLead.name,
      },
    ]);
    listTrialClassesMock.mockResolvedValue([
      {
        id: 't1',
        tenant_id: 'peskids',
        lead_id: baseLead.id,
        scheduled_date: '2026-07-25',
        scheduled_time: '15:00:00',
        modality: 'llanogrande',
        teacher_name: null,
        notes: null,
        status: 'scheduled',
        created_at: '2026-07-23T09:00:00.000Z',
        updated_at: '2026-07-23T09:00:00.000Z',
        lead_name: baseLead.name,
        lead_email: baseLead.email,
      },
    ]);

    const now = new Date('2026-07-23T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const result = await getLead360(baseLead.id, 'peskids');

    vi.useRealTimers();

    expect(result).not.toBeNull();
    expect(getLeadForAdminMock).toHaveBeenCalledWith(baseLead.id, 'peskids');
    expect(listFollowupsMock).toHaveBeenCalledWith({
      contact_type: 'lead',
      contact_id: baseLead.id,
    });
    expect(listTrialClassesMock).toHaveBeenCalledWith({ lead_id: baseLead.id });
    expect(decorateLeadWithCrmUrlsMock).toHaveBeenCalledWith(baseLead);

    expect(result?.lead.twenty_person_url).toContain('person-1');
    expect(result?.followups).toHaveLength(1);
    expect(result?.trials).toHaveLength(1);
    expect(result?.aging_badge?.bucket).toBe('escalation_48h');

    const labels = result?.timeline.map((entry) => entry.label) ?? [];
    expect(labels).toContain('Interesado registrado');
    expect(labels.some((label) => label.startsWith('Seguimiento'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Clase de prueba'))).toBe(true);
    expect(labels).toContain('Registro sincronizado con Twenty CRM');
    expect(result?.timeline.length).toBeGreaterThan(1);
    const firstEntry = result?.timeline[0];
    const secondEntry = result?.timeline[1];
    expect(firstEntry && secondEntry && firstEntry.at >= secondEntry.at).toBe(true);
  });
});
