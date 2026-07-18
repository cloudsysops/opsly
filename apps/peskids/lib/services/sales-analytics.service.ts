import type { DashboardData, DashboardSalesAnalytics } from '../types';

type SalesLead = DashboardData['new_leads'][number];
type SalesFollowup = DashboardData['followups'][number] & {
  created_at?: string;
};
type SalesTrialClass = {
  lead_id: string;
  created_at?: string;
  status?: string;
};

const SOURCE_LABELS: Record<
  'instagram' | 'facebook' | 'website' | 'referral' | 'other',
  string
> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  website: 'Web',
  referral: 'Recomendación',
  other: 'Otro',
};

const EMPTY_STAGE_COUNTS: DashboardSalesAnalytics['lead_status_counts'] = {
  new: 0,
  contacted: 0,
  trial: 0,
  enrolled: 0,
  active: 0,
  renewal: 0,
  archived: 0,
};

function normalizeSource(
  value: string | null | undefined
): 'instagram' | 'facebook' | 'website' | 'referral' | 'other' {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return 'other';
  if (['instagram', 'ig', 'insta'].includes(normalized)) return 'instagram';
  if (['facebook', 'fb', 'meta'].includes(normalized)) return 'facebook';
  if (['website', 'web', 'site', 'direct', 'organic', 'search', 'google'].includes(normalized)) {
    return 'website';
  }
  if (['referral', 'friend', 'referido', 'recommendation', 'recomendation'].includes(normalized)) {
    return 'referral';
  }
  return 'other';
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hoursBetween(older: string | undefined, newer: string | undefined): number | null {
  const start = toDate(older);
  const end = toDate(newer);
  if (!start || !end) return null;
  const diff = end.getTime() - start.getTime();
  if (diff < 0) return null;
  return Math.round((diff / 3_600_000) * 10) / 10;
}

function buildDateSeries(startISO: string): string[] {
  const start = toDate(startISO);
  if (!start) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  const series: string[] = [];
  while (cursor <= today) {
    series.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}

export function buildDashboardSalesAnalytics(input: {
  periodStartISO: string;
  leads: SalesLead[];
  followups: SalesFollowup[];
  trialClasses: SalesTrialClass[];
}): DashboardSalesAnalytics {
  const statusCounts = { ...EMPTY_STAGE_COUNTS };
  const sourceCounts: Record<'instagram' | 'facebook' | 'website' | 'referral' | 'other', number> = {
    instagram: 0,
    facebook: 0,
    website: 0,
    referral: 0,
    other: 0,
  };
  const followupByLead = new Map<string, string>();
  for (const followup of input.followups) {
    if (followup.contact_type !== 'lead') continue;
    const current = followupByLead.get(followup.contact_id);
    if (!current || (followup.created_at && followup.created_at < current)) {
      followupByLead.set(followup.contact_id, followup.created_at ?? current ?? '');
    }
  }

  const trialByLead = new Map<string, string>();
  let trialsScheduledCount = 0;
  for (const trial of input.trialClasses) {
    if (trial.status && !['scheduled', 'confirmed', 'attended'].includes(trial.status)) continue;
    trialsScheduledCount += 1;
    const current = trialByLead.get(trial.lead_id);
    if (!current || (trial.created_at && trial.created_at < current)) {
      trialByLead.set(trial.lead_id, trial.created_at ?? current ?? '');
    }
  }

  const leadsByDay = new Map<string, { total: number; synced_to_twenty: number }>();
  const dateSeries = buildDateSeries(input.periodStartISO);
  for (const day of dateSeries) {
    leadsByDay.set(day, { total: 0, synced_to_twenty: 0 });
  }

  const followupDiffs: number[] = [];
  const trialDiffs: number[] = [];

  for (const lead of input.leads) {
    const leadCreatedAt = toDate(lead.created_at);
    if (leadCreatedAt) {
      const key = dayKey(leadCreatedAt);
      const bucket = leadsByDay.get(key);
      if (bucket) {
        bucket.total += 1;
        if (lead.twenty_person_id && lead.twenty_opportunity_id) {
          bucket.synced_to_twenty += 1;
        }
      } else {
        leadsByDay.set(key, {
          total: 1,
          synced_to_twenty: lead.twenty_person_id && lead.twenty_opportunity_id ? 1 : 0,
        });
      }
    }

    statusCounts[lead.status] += 1;
    sourceCounts[normalizeSource(lead.referral_source)] += 1;

    const followupCreatedAt = followupByLead.get(lead.id);
    const trialCreatedAt = trialByLead.get(lead.id);
    const leadCreatedAtISO = lead.created_at;
    const followupHours = hoursBetween(leadCreatedAtISO, followupCreatedAt ?? undefined);
    const trialHours = hoursBetween(leadCreatedAtISO, trialCreatedAt ?? undefined);
    if (followupHours !== null) followupDiffs.push(followupHours);
    if (trialHours !== null) trialDiffs.push(trialHours);
  }

  const average = (values: number[]): number | null => {
    if (values.length === 0) return null;
    const total = values.reduce((sum, value) => sum + value, 0);
    return Math.round((total / values.length) * 10) / 10;
  };

  return {
    leads_by_day: Array.from(leadsByDay.entries()).map(([date, value]) => ({
      date,
      total: value.total,
      synced_to_twenty: value.synced_to_twenty,
    })),
    lead_status_counts: statusCounts,
    source_breakdown: (Object.entries(sourceCounts) as Array<
      ['instagram' | 'facebook' | 'website' | 'referral' | 'other', number]
    >).map(([key, count]) => ({
      key,
      label: SOURCE_LABELS[key],
      count,
    })),
    avg_hours_to_first_followup: average(followupDiffs),
    avg_hours_to_trial: average(trialDiffs),
    trials_scheduled_count: trialsScheduledCount,
  };
}
