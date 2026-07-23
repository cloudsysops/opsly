import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  buildExecutiveDashboard,
  calendarDateInTz,
  greetingForHour,
  startOfMonth,
  startOfWeekMonday,
} from '../executive-dashboard';
import type { DashboardData } from '../types';

const emptyIntegration: DashboardData['integration_status'] = {
  twenty: {
    label: 'Twenty',
    enabled: true,
    status: 'ok',
    detail: 'ok',
    url: null,
    checked_at: null,
  },
  ghl: {
    label: 'GHL',
    enabled: false,
    status: 'disabled',
    detail: 'off',
    url: null,
    checked_at: null,
  },
  n8n: {
    label: 'n8n',
    enabled: true,
    status: 'warning',
    detail: 'latency',
    url: null,
    checked_at: null,
  },
  wacrm: {
    label: 'WACRM',
    enabled: false,
    status: 'disabled',
    detail: 'off',
    url: null,
    checked_at: null,
  },
};

describe('executive-dashboard helpers', () => {
  it('computes Bogota calendar dates and week/month bounds', () => {
    const now = new Date('2026-07-22T18:00:00.000Z'); // afternoon Bogota
    expect(calendarDateInTz(now, 'America/Bogota')).toBe('2026-07-22');
    expect(startOfWeekMonday('2026-07-22')).toBe('2026-07-20');
    expect(startOfMonth('2026-07-22')).toBe('2026-07-01');
    expect(addCalendarDays('2026-07-22', 1)).toBe('2026-07-23');
    expect(greetingForHour(9)).toBe('Buenos días');
    expect(greetingForHour(15)).toBe('Buenas tardes');
    expect(greetingForHour(21)).toBe('Buenas noches');
  });
});

describe('buildExecutiveDashboard', () => {
  it('builds KPIs, overdue followups, agenda and rule-based priorities', () => {
    const now = new Date('2026-07-22T15:00:00.000Z');
    const result = buildExecutiveDashboard({
      now,
      timeZone: 'America/Bogota',
      enrollmentsThisMonth: 2,
      avgHoursToFirstFollowup: 4.5,
      salesStatusCounts: {
        new: 2,
        contacted: 1,
        trial: 1,
        enrolled: 1,
        active: 0,
        renewal: 0,
        archived: 0,
      },
      integrationStatus: emptyIntegration,
      recentMessages: [],
      leads: [
        {
          id: 'l1',
          name: 'Ana',
          email: 'ana@example.com',
          phone: '+573001',
          class_modality: 'llanogrande',
          neighborhood: null,
          grade_interested: '6-8',
          status: 'new',
          admin_notes: null,
          referral_code: null,
          referred_by_code: null,
          referral_discount_cents: 0,
          referral_redemptions: 0,
          created_at: '2026-07-20T10:00:00.000Z',
          referral_source: 'instagram',
        },
        {
          id: 'l2',
          name: 'Bruno',
          email: 'bruno@example.com',
          phone: '+573002',
          class_modality: 'domicilio',
          neighborhood: null,
          grade_interested: '9-12',
          status: 'enrolled',
          admin_notes: null,
          referral_code: null,
          referred_by_code: null,
          referral_discount_cents: 0,
          referral_redemptions: 0,
          created_at: '2026-07-18T10:00:00.000Z',
          referral_source: 'instagram',
        },
        {
          id: 'l3',
          name: 'Carla',
          email: 'carla@example.com',
          phone: '+573003',
          class_modality: 'llanogrande',
          neighborhood: null,
          grade_interested: '6-8',
          status: 'contacted',
          admin_notes: null,
          referral_code: null,
          referred_by_code: null,
          referral_discount_cents: 0,
          referral_redemptions: 0,
          created_at: '2026-07-21T10:00:00.000Z',
          referral_source: 'website',
        },
      ],
      followups: [
        {
          id: 'f1',
          contact_id: 'l1',
          contact_type: 'lead',
          due_date: '2026-07-20',
          type: 'call',
          status: 'pending',
          notes: null,
        },
        {
          id: 'f2',
          contact_id: 'l3',
          contact_type: 'lead',
          due_date: '2026-07-22',
          type: 'call',
          status: 'pending',
          notes: null,
        },
      ],
      trials: [
        {
          id: 't1',
          lead_id: 'l2',
          scheduled_date: '2026-07-22',
          scheduled_time: '10:30:00',
          status: 'scheduled',
        },
        {
          id: 't2',
          lead_id: 'l3',
          scheduled_date: '2026-07-21',
          scheduled_time: '09:00:00',
          status: 'completed',
        },
      ],
    });

    expect(result.kpis.new_leads).toBe(3);
    expect(result.kpis.uncontacted).toBe(1);
    expect(result.kpis.overdue_followups).toBe(1);
    expect(result.kpis.trials_today).toBe(1);
    expect(result.kpis.trials_this_week).toBe(2);
    expect(result.kpis.enrollments_this_month).toBe(2);
    expect(result.kpis.lead_to_trial_pct).toBe(67);
    expect(result.kpis.trial_to_enroll_pct).toBe(50);
    expect(result.kpis.avg_hours_to_first_contact).toBe(4.5);
    expect(result.kpis.best_source?.key).toBe('instagram');
    expect(result.agenda_today.some((item) => item.kind === 'trial')).toBe(true);
    expect(result.priority_tasks[0]?.id).toBe('overdue-followups');
    expect(result.integration_issues).toHaveLength(1);
    expect(result.integration_issues[0]?.label).toBe('n8n');
    expect(result.recommended_actions.length).toBeGreaterThan(0);
  });

  it('returns all-clear when nothing is overdue', () => {
    const result = buildExecutiveDashboard({
      now: new Date('2026-07-22T15:00:00.000Z'),
      timeZone: 'America/Bogota',
      enrollmentsThisMonth: 0,
      avgHoursToFirstFollowup: null,
      salesStatusCounts: {
        new: 0,
        contacted: 0,
        trial: 0,
        enrolled: 0,
        active: 0,
        renewal: 0,
        archived: 0,
      },
      integrationStatus: {
        ...emptyIntegration,
        n8n: { ...emptyIntegration.n8n, status: 'ok', detail: 'ok' },
      },
      recentMessages: [],
      leads: [],
      followups: [],
      trials: [],
    });

    expect(result.priority_tasks[0]?.id).toBe('all-clear');
    expect(result.kpis.best_source).toBeNull();
    expect(result.agenda_today).toEqual([]);
  });
});
