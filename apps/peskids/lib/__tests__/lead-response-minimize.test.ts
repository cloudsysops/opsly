import { describe, expect, it } from 'vitest';
import { minimizeLeadForStaffApi } from '@/lib/lead-response-minimize';
import type { DashboardLead } from '@/lib/services/lead-admin.service';

const lead: DashboardLead = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'TEST Parent',
  email: 'qa-lead@example.com',
  phone: '+573000000000',
  class_modality: 'llanogrande',
  neighborhood: 'QA',
  grade_interested: 'K-5',
  child_name: 'Real Child Name',
  status: 'new',
  admin_notes: null,
  referral_code: null,
  referred_by_code: null,
  referral_discount_cents: 0,
  referral_redemptions: 0,
  referral_source: null,
  created_at: '2026-09-05T00:00:00.000Z',
  twenty_person_id: null,
  twenty_opportunity_id: null,
  twenty_person_url: null,
  twenty_opportunity_url: null,
  twenty_sync_status: 'pending',
};

describe('minimizeLeadForStaffApi', () => {
  it('drops child_name from the staff JSON shape', () => {
    const view = minimizeLeadForStaffApi(lead);
    expect(view.has_child_name).toBe(true);
    expect(view).not.toHaveProperty('child_name');
    expect(view.email).toBe('qa-lead@example.com');
  });
});
