import { describe, expect, it } from 'vitest';
import type { DashboardLead } from '@/lib/services/lead-admin.service';
import {
  buildPipelineLeadCard,
  buildTrialsByLeadId,
  groupLeadsIntoPipelineColumns,
  leadHasAttendedTrial,
  matchesPipelineFilters,
  resolvePipelineColumn,
  type TrialSummary,
} from '@/lib/services/lead-pipeline.service';

const NOW = new Date('2026-07-23T12:00:00.000Z');

function lead(partial: Partial<DashboardLead> & Pick<DashboardLead, 'id' | 'status'>): DashboardLead {
  return {
    id: partial.id,
    name: partial.name ?? 'Test Lead',
    email: partial.email ?? 'test@example.com',
    phone: partial.phone ?? null,
    class_modality: partial.class_modality ?? 'llanogrande',
    neighborhood: partial.neighborhood ?? null,
    grade_interested: partial.grade_interested ?? '5-7',
    status: partial.status,
    admin_notes: partial.admin_notes ?? null,
    referral_code: null,
    referred_by_code: null,
    referral_discount_cents: 0,
    referral_redemptions: 0,
    referral_source: partial.referral_source ?? 'instagram',
    created_at: partial.created_at ?? '2026-07-20T10:00:00.000Z',
    twenty_person_id: null,
    twenty_opportunity_id: null,
  };
}

describe('resolvePipelineColumn', () => {
  const trials = buildTrialsByLeadId([
    { lead_id: 'trial-done', status: 'attended' },
    { lead_id: 'trial-scheduled', status: 'scheduled' },
  ]);

  it('maps core admin statuses to expected columns', () => {
    expect(resolvePipelineColumn(lead({ id: 'a', status: 'new' }), trials)).toBe('nuevos');
    expect(resolvePipelineColumn(lead({ id: 'b', status: 'contacted' }), trials)).toBe(
      'contactados'
    );
    expect(resolvePipelineColumn(lead({ id: 'c', status: 'enrolled' }), trials)).toBe(
      'matriculados'
    );
    expect(resolvePipelineColumn(lead({ id: 'd', status: 'active' }), trials)).toBe('matriculados');
    expect(resolvePipelineColumn(lead({ id: 'e', status: 'renewal' }), trials)).toBe(
      'matriculados'
    );
    expect(resolvePipelineColumn(lead({ id: 'f', status: 'archived' }), trials)).toBe('perdidos');
  });

  it('splits trial leads by attended trial_classes', () => {
    expect(resolvePipelineColumn(lead({ id: 'trial-done', status: 'trial' }), trials)).toBe(
      'trial_realizado'
    );
    expect(resolvePipelineColumn(lead({ id: 'trial-scheduled', status: 'trial' }), trials)).toBe(
      'trial_agendado'
    );
    expect(resolvePipelineColumn(lead({ id: 'trial-unknown', status: 'trial' }), trials)).toBe(
      'trial_agendado'
    );
  });
});

describe('leadHasAttendedTrial', () => {
  it('returns true only when at least one trial is attended', () => {
    const map = buildTrialsByLeadId([
      { lead_id: 'x', status: 'scheduled' },
      { lead_id: 'x', status: 'attended' },
    ]);
    expect(leadHasAttendedTrial('x', map)).toBe(true);
    expect(leadHasAttendedTrial('y', map)).toBe(false);
  });
});

describe('groupLeadsIntoPipelineColumns', () => {
  const trials: TrialSummary[] = [
    { lead_id: 'l3', status: 'attended' },
    { lead_id: 'l4', status: 'confirmed' },
  ];

  it('groups leads and applies filters', () => {
    const leads = [
      lead({ id: 'l1', status: 'new', referral_source: 'instagram' }),
      lead({ id: 'l2', status: 'contacted', class_modality: 'domicilio' }),
      lead({ id: 'l3', status: 'trial' }),
      lead({ id: 'l4', status: 'trial' }),
      lead({ id: 'l5', status: 'enrolled' }),
      lead({ id: 'l6', status: 'archived' }),
    ];

    const board = groupLeadsIntoPipelineColumns(leads, trials, new Set(), {}, NOW);

    expect(board.counts.nuevos).toBe(1);
    expect(board.counts.contactados).toBe(1);
    expect(board.counts.trial_agendado).toBe(1);
    expect(board.counts.trial_realizado).toBe(1);
    expect(board.counts.matriculados).toBe(1);
    expect(board.counts.perdidos).toBe(1);
    expect(board.total).toBe(6);
  });

  it('filters by source and modality', () => {
    const leads = [
      lead({ id: 'l1', status: 'new', referral_source: 'instagram' }),
      lead({ id: 'l2', status: 'new', referral_source: 'website' }),
    ];

    const bySource = groupLeadsIntoPipelineColumns(
      leads,
      [],
      new Set(),
      { source: 'Instagram' },
      NOW
    );
    expect(bySource.total).toBe(1);
    expect(bySource.columns.nuevos[0]?.lead.id).toBe('l1');

    const byModality = groupLeadsIntoPipelineColumns(
      [lead({ id: 'l1', status: 'new', class_modality: 'domicilio' })],
      [],
      new Set(),
      { modality: 'domicilio' },
      NOW
    );
    expect(byModality.total).toBe(1);
  });
});

describe('buildPipelineLeadCard overdue', () => {
  it('flags overdue followups and aging badges', () => {
    const staleNew = lead({
      id: 'old-new',
      status: 'new',
      created_at: '2026-07-22T10:00:00.000Z',
    });

    const agingCard = buildPipelineLeadCard(staleNew, new Map(), new Set(), NOW);
    expect(agingCard.overdue).toBe(true);
    expect(agingCard.aging_badge?.bucket).toBe('reminder_24h');

    const followupCard = buildPipelineLeadCard(
      lead({ id: 'followup', status: 'contacted' }),
      new Map(),
      new Set(['followup']),
      NOW
    );
    expect(followupCard.overdue).toBe(true);
    expect(followupCard.has_overdue_followup).toBe(true);
  });
});

describe('matchesPipelineFilters date range', () => {
  it('respects created_from and created_to', () => {
    const card = buildPipelineLeadCard(
      lead({ id: 'd', status: 'new', created_at: '2026-07-15T10:00:00.000Z' }),
      new Map(),
      new Set(),
      NOW
    );

    expect(matchesPipelineFilters(card, { created_from: '2026-07-10' })).toBe(true);
    expect(matchesPipelineFilters(card, { created_from: '2026-07-20' })).toBe(false);
    expect(matchesPipelineFilters(card, { created_to: '2026-07-20' })).toBe(true);
    expect(matchesPipelineFilters(card, { created_to: '2026-07-10' })).toBe(false);
  });
});
