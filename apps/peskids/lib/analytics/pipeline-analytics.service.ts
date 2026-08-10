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
  /** Always true for Supabase-backed metrics (GHL removed). */
  crmConfigured: boolean;
  crmError?: string;
  /** @deprecated Use crmConfigured — kept for UI compatibility */
  ghlConfigured: boolean;
  /** @deprecated Use crmError */
  ghlError?: string;
}

interface RevenueAttributionRow {
  source: string;
  revenue: number;
  count: number;
}

const LOCAL_STATUS_TO_STAGE: Record<string, PipelineStage> = {
  new: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Trial Class',
  converted: 'Enrolled',
  lost: 'Lost',
  active: 'Active Student',
  renewal: 'Renewal',
};

function toMonthKey(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function emptyByStage(): Record<PipelineStage, number> {
  return {
    'New Lead': 0,
    Contacted: 0,
    'Trial Class': 0,
    Enrolled: 0,
    'Active Student': 0,
    Renewal: 0,
    Lost: 0,
  };
}

export class PipelineAnalyticsService {
  async getPipelineMetrics(): Promise<PipelineMetrics> {
    try {
      const supabase = supabaseServer();
      const { data, error } = await supabase
        .from('leads')
        .select('id, status, source, created_at, updated_at')
        .eq('tenant_id', 'peskids')
        .limit(2000);

      if (error) {
        return this.buildFallbackMetrics(error.message);
      }

      const rows = data ?? [];
      const byStage = emptyByStage();
      const bySource: Record<string, number> = {};
      const monthly: Record<string, { newLeads: number; trials: number; enrollments: number }> = {};

      for (const row of rows) {
        const stage = LOCAL_STATUS_TO_STAGE[String(row.status ?? 'new')] ?? 'New Lead';
        byStage[stage] = (byStage[stage] ?? 0) + 1;

        const source = String(row.source ?? 'unknown').toLowerCase();
        bySource[source] = (bySource[source] ?? 0) + 1;

        if (row.created_at) {
          const month = toMonthKey(row.created_at);
          if (!monthly[month]) {
            monthly[month] = { newLeads: 0, trials: 0, enrollments: 0 };
          }
          monthly[month].newLeads += 1;
          if (stage === 'Trial Class') monthly[month].trials += 1;
          if (stage === 'Enrolled' || stage === 'Active Student') {
            monthly[month].enrollments += 1;
          }
        }
      }

      const conversionRates = this.computeConversionRates(byStage);
      const monthlyTrend = Object.keys(monthly)
        .sort()
        .map((month) => ({ month, ...monthly[month] }));

      return {
        totalLeads: rows.length,
        byStage,
        conversionRates,
        bySource,
        timeToConversion: {
          avgDaysLeadToTrial: 0,
          avgDaysTrialToEnrolled: 0,
        },
        monthlyTrend,
        crmConfigured: true,
        ghlConfigured: false,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.buildFallbackMetrics(msg);
    }
  }

  async getLeadSourceBreakdown(): Promise<Record<string, number>> {
    const metrics = await this.getPipelineMetrics();
    if (Object.keys(metrics.bySource).length === 0) {
      return { web: 0, whatsapp: 0, referral: 0, event: 0, manual: 0, unknown: 0 };
    }
    return metrics.bySource;
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

  private computeConversionRates(
    byStage: Record<PipelineStage, number>
  ): PipelineMetrics['conversionRates'] {
    const leadToContacted =
      byStage['New Lead'] > 0
        ? Math.round((byStage.Contacted / byStage['New Lead']) * 100)
        : 0;
    const contactedToTrial =
      byStage.Contacted > 0
        ? Math.round((byStage['Trial Class'] / byStage.Contacted) * 100)
        : 0;
    const trialToEnrolled =
      byStage['Trial Class'] > 0
        ? Math.round((byStage.Enrolled / byStage['Trial Class']) * 100)
        : 0;
    const enrolledToActive =
      byStage.Enrolled > 0
        ? Math.round((byStage['Active Student'] / byStage.Enrolled) * 100)
        : 0;

    return { leadToContacted, contactedToTrial, trialToEnrolled, enrolledToActive };
  }

  private buildFallbackMetrics(errorMsg: string): PipelineMetrics {
    return {
      totalLeads: 0,
      byStage: emptyByStage(),
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
      crmConfigured: false,
      crmError: errorMsg,
      ghlConfigured: false,
      ghlError: errorMsg,
    };
  }
}
