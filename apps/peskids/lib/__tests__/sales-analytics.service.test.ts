import { describe, expect, it } from 'vitest';
import { buildDashboardSalesAnalytics } from '@/lib/services/sales-analytics.service';
import type { DashboardData } from '@/lib/types';

function lead(
  overrides: Partial<DashboardData['new_leads'][number]>
): DashboardData['new_leads'][number] {
  return {
    id: 'lead-1',
    name: 'Ana',
    email: 'ana@example.com',
    phone: '3000000000',
    class_modality: 'llanogrande',
    neighborhood: 'Llanogrande',
    grade_interested: 'K-5',
    status: 'new',
    admin_notes: null,
    referral_code: null,
    referred_by_code: null,
    referral_discount_cents: 0,
    referral_redemptions: 0,
    created_at: '2026-09-06T08:00:00Z',
    ...overrides,
  };
}

describe('sales analytics', () => {
  it('breaks down leads and matriculations by modality', () => {
    const result = buildDashboardSalesAnalytics({
      periodStartISO: '2026-09-06T00:00:00Z',
      leads: [
        lead({ id: 'llano-1', class_modality: 'llanogrande', status: 'enrolled' }),
        lead({ id: 'domi-1', class_modality: 'domicilio', status: 'new' }),
      ],
      followups: [
        { contact_id: 'domi-1', contact_type: 'lead', created_at: '2026-09-06T10:00:00Z' },
      ],
      trialClasses: [],
    });

    expect(result.modality_breakdown).toEqual([
      { key: 'llanogrande', label: 'Llanogrande', total: 1, enrolled: 1, conversion_pct: 100 },
      { key: 'domicilio', label: 'Domicilio', total: 1, enrolled: 0, conversion_pct: 0 },
      { key: 'other', label: 'Sin definir', total: 0, enrolled: 0, conversion_pct: null },
    ]);
    expect(result.avg_hours_to_first_followup).toBe(2);
  });
});
