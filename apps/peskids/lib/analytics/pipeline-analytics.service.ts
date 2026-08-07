import { getGoHighLevelService } from '@intcloudsysops/services';
import type { Opportunity } from '@intcloudsysops/services';
import { isGoHighLevelPeskidsConfigured } from '@intcloudsysops/services';
import { isPeskidsGhlEnabled } from '@intcloudsysops/services';
import { supabaseServer } from '@/lib/supabase';

export type PipelineStage =
  | 'New Lead'
  | 'Contacted'
  | 'Trial Class'
  | 'Enrolled'
  | 'Active Student'
  | 'Renewal'
  | 'Lost';

export const PIPELINE_STAGE_ORDER: readonly PipelineStage[] = [
  'New Lead',
  'Contacted',
  'Trial Class',
  'Enrolled',
  'Active Student',
  'Renewal',
] as const;

export interface PipelineMetrics {
  totalLeads: number;
  byStage: Record<PipelineStage, number>;
  conversionRates: {
    leadToContacted: number;
    contactedToTrial: number;
    trialToEnrolled: number;
    enrolledToActive: number;
  };
  bySource: Record<string, number>;
  timeToConversion: {
    avgDaysLeadToTrial: number;
    avgDaysTrialToEnrolled: number;
  };
  monthlyTrend: Array<{
    month: string;
    newLeads: number;
    trials: number;
    enrollments: number;
  }>;
  ghlConfigured: boolean;
  ghlError?: string;
}

interface RevenueAttributionRow {
  source: string;
  revenue: number;
  count: number;
}

function extractSource(opp: Opportunity): string {
  const contactSource = opp.contact?.source;
  if (contactSource) return contactSource.toLowerCase();
  return 'unknown';
}

function stageFromOpp(opp: Opportunity): PipelineStage | null {
  if (!opp.pipelineStageId) return null;

  const STAGE_BY_ID: Record<string, PipelineStage> = {
    'f4c7365b-efe8-4d33-9559-c7f06881f172': 'New Lead',
    '75742c84-9063-4539-b755-b09bfdeb6346': 'Contacted',
    '13f095d8-4c87-4637-a6f7-b8d2d294ad0b': 'Trial Class',
    'd69d8656-1836-4d48-8a83-5268895c5c74': 'Enrolled',
    'c9b615f7-b4da-416c-a3b1-28be6da1d063': 'Active Student',
    'e9c02a74-f298-48a4-a1e5-1c952f950531': 'Renewal',
    '6faadc43-3454-4a0a-af6f-6ee7c4ecbad7': 'Lost',
  };

  return STAGE_BY_ID[opp.pipelineStageId] ?? null;
}

function toMonthKey(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

export class PipelineAnalyticsService {
  async getPipelineMetrics(): Promise<PipelineMetrics> {
    const ghlConfigured =
      isPeskidsGhlEnabled() && isGoHighLevelPeskidsConfigured();

    if (!ghlConfigured) {
      return this.buildFallbackMetrics(
        isPeskidsGhlEnabled()
          ? 'GHL not configured for Peskids'
          : 'GHL legacy analytics disabled (PESKIDS_GHL_ENABLED=false)'
      );
    }

    try {
      const service = getGoHighLevelService();

      const PIPELINE_ID = 'bWKAQuLTQUjeGAvgf9fX';

      const allResult = await service.searchOpportunities('peskids', {
        pipelineId: PIPELINE_ID,
        limit: 1000,
      });

      const opportunities = allResult.opportunities;

      const byStage = this.countByStage(opportunities);
      const totalLeads = opportunities.length;

      const conversionRates = this.computeConversionRates(byStage);

      const bySource = this.countBySource(opportunities);

      const timeToConversion = this.computeTimeToConversion(opportunities);

      const monthlyTrend = this.buildMonthlyTrend(opportunities);

      return {
        totalLeads,
        byStage,
        conversionRates,
        bySource,
        timeToConversion,
        monthlyTrend,
        ghlConfigured: true,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.buildFallbackMetrics(msg);
    }
  }

  async getLeadSourceBreakdown(): Promise<Record<string, number>> {
    const ghlConfigured =
      isPeskidsGhlEnabled() && isGoHighLevelPeskidsConfigured();
    if (!ghlConfigured) return { web: 0, whatsapp: 0, referral: 0, event: 0, manual: 0, unknown: 0 };

    try {
      const service = getGoHighLevelService();
      const contacts = await service.getContacts('peskids', { limit: 1000 });
      const breakdown: Record<string, number> = {};

      for (const contact of contacts.data) {
        const source = (contact.source ?? 'unknown').toLowerCase();
        breakdown[source] = (breakdown[source] ?? 0) + 1;
      }

      return breakdown;
    } catch {
      return { web: 0, whatsapp: 0, referral: 0, event: 0, manual: 0, unknown: 0 };
    }
  }

  async getRevenueAttribution(): Promise<RevenueAttributionRow[]> {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('peskids.class_enrollments')
      .select(`
        id,
        lead_id,
        peskids!inner(lead_id),
        payments!inner(amount, source)
      `)
      .eq('tenant_slug', 'peskids');

    if (error || !data) {
      return [];
    }

    const attribution: Record<string, { revenue: number; count: number }> = {};
    for (const row of data as Array<{ payments?: Array<{ amount: number; source?: string }> }>) {
      const payments = row.payments ?? [];
      for (const payment of payments) {
        const source = (payment.source ?? 'unknown').toLowerCase();
        if (!attribution[source]) attribution[source] = { revenue: 0, count: 0 };
        attribution[source].revenue += payment.amount;
        attribution[source].count += 1;
      }
    }

    return Object.entries(attribution)
      .map(([source, vals]) => ({ source, ...vals }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private countByStage(opportunities: Opportunity[]): Record<PipelineStage, number> {
    const counts: Record<string, number> = {};
    for (const opp of opportunities) {
      const stage = stageFromOpp(opp);
      if (stage) {
        counts[stage] = (counts[stage] ?? 0) + 1;
      }
    }
    return {
      'New Lead': counts['New Lead'] ?? 0,
      Contacted: counts['Contacted'] ?? 0,
      'Trial Class': counts['Trial Class'] ?? 0,
      Enrolled: counts['Enrolled'] ?? 0,
      'Active Student': counts['Active Student'] ?? 0,
      Renewal: counts['Renewal'] ?? 0,
      Lost: counts['Lost'] ?? 0,
    };
  }

  private computeConversionRates(
    byStage: Record<PipelineStage, number>
  ): PipelineMetrics['conversionRates'] {
    const leadToContacted = byStage['New Lead'] > 0
      ? Math.round((byStage.Contacted / byStage['New Lead']) * 100)
      : 0;
    const contactedToTrial = byStage.Contacted > 0
      ? Math.round((byStage['Trial Class'] / byStage.Contacted) * 100)
      : 0;
    const trialToEnrolled = byStage['Trial Class'] > 0
      ? Math.round((byStage.Enrolled / byStage['Trial Class']) * 100)
      : 0;
    const enrolledToActive = byStage.Enrolled > 0
      ? Math.round((byStage['Active Student'] / byStage.Enrolled) * 100)
      : 0;

    return { leadToContacted, contactedToTrial, trialToEnrolled, enrolledToActive };
  }

  private countBySource(opportunities: Opportunity[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const opp of opportunities) {
      const src = extractSource(opp);
      counts[src] = (counts[src] ?? 0) + 1;
    }
    return counts;
  }

  private computeTimeToConversion(
    opportunities: Opportunity[]
  ): PipelineMetrics['timeToConversion'] {
    const trialDates: Array<{ leadDate: string | undefined; trialDate: string }> = [];
    const enrolledDates: Array<{ trialDate: string | undefined; enrolledDate: string }> = [];

    const trialStageIds = ['13f095d8-4c87-4637-a6f7-b8d2d294ad0b'];
    const enrolledStageIds = ['d69d8656-1836-4d48-8a83-5268895c5c74'];
    const newLeadStageIds = ['f4c7365b-efe8-4d33-9559-c7f06881f172'];

    const oppsByContact = this.groupByContactId(opportunities);

    for (const [, stages] of oppsByContact.entries()) {
      const leadOpp = stages.find((o) => newLeadStageIds.includes(o.pipelineStageId ?? ''));
      const trialOpp = stages.find((o) => trialStageIds.includes(o.pipelineStageId ?? ''));
      const enrolledOpp = stages.find((o) => enrolledStageIds.includes(o.pipelineStageId ?? ''));

      if (leadOpp?.createdAt && trialOpp?.createdAt) {
        trialDates.push({ leadDate: leadOpp.createdAt, trialDate: trialOpp.createdAt });
      }
      if (trialOpp?.createdAt && enrolledOpp?.createdAt) {
        enrolledDates.push({ trialDate: trialOpp.createdAt, enrolledDate: enrolledOpp.createdAt });
      }
    }

    const avgDaysLeadToTrial = trialDates.length > 0
      ? Math.round(
          trialDates.reduce((sum, d) => sum + daysBetween(d.leadDate!, d.trialDate), 0) /
            trialDates.length
        )
      : 0;

    const avgDaysTrialToEnrolled = enrolledDates.length > 0
      ? Math.round(
          enrolledDates.reduce((sum, d) => sum + daysBetween(d.trialDate!, d.enrolledDate), 0) /
            enrolledDates.length
        )
      : 0;

    return { avgDaysLeadToTrial, avgDaysTrialToEnrolled };
  }

  private groupByContactId(
    opportunities: Opportunity[]
  ): Map<string, Opportunity[]> {
    const groups = new Map<string, Opportunity[]>();
    for (const opp of opportunities) {
      if (!opp.contactId) continue;
      const existing = groups.get(opp.contactId) ?? [];
      existing.push(opp);
      groups.set(opp.contactId, existing);
    }
    return groups;
  }

  private buildMonthlyTrend(
    opportunities: Opportunity[]
  ): PipelineMetrics['monthlyTrend'] {
    const trials: Record<string, number> = {};
    const enrollments: Record<string, number> = {};
    const newLeads: Record<string, number> = {};

    for (const opp of opportunities) {
      if (!opp.createdAt) continue;
      const month = toMonthKey(opp.createdAt);
      const stage = stageFromOpp(opp);

      if (stage === 'New Lead') {
        newLeads[month] = (newLeads[month] ?? 0) + 1;
      } else if (stage === 'Trial Class') {
        trials[month] = (trials[month] ?? 0) + 1;
      } else if (stage === 'Enrolled') {
        enrollments[month] = (enrollments[month] ?? 0) + 1;
      }
    }

    const allMonths = new Set([
      ...Object.keys(newLeads),
      ...Object.keys(trials),
      ...Object.keys(enrollments),
    ]);

    return [...allMonths].sort().map((month) => ({
      month,
      newLeads: newLeads[month] ?? 0,
      trials: trials[month] ?? 0,
      enrollments: enrollments[month] ?? 0,
    }));
  }

  private buildFallbackMetrics(errorMsg: string): PipelineMetrics {
    return {
      totalLeads: 0,
      byStage: {
        'New Lead': 0,
        Contacted: 0,
        'Trial Class': 0,
        Enrolled: 0,
        'Active Student': 0,
        Renewal: 0,
        Lost: 0,
      },
      conversionRates: {
        leadToContacted: 0,
        contactedToTrial: 0,
        trialToEnrolled: 0,
        enrolledToActive: 0,
      },
      bySource: {},
      timeToConversion: {
        avgDaysLeadToTrial: 0,
        avgDaysTrialToEnrolled: 0,
      },
      monthlyTrend: [],
      ghlConfigured: false,
      ghlError: errorMsg,
    };
  }
}
