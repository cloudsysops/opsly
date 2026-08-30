import { supabaseServer } from '@/lib/supabase';
import type { PipelineRule, PipelineStage } from '@/lib/agents/pipeline-rules';
import {
  buildPipelineRules,
  LOCAL_STATUS_TO_PIPELINE_STAGE,
  PIPELINE_STAGE_TO_LOCAL_STATUS,
} from '@/lib/agents/pipeline-rules';
import { isPeskidsRenewalReminderEnabled } from '@/lib/peskids-pro-flags';
import { createFollowup } from '@/lib/services/followup-admin.service';
import { emitLeadRenewalDue } from '@/lib/events';

function platformPeskidsLeads() {
  const client = supabaseServer() as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform').from('peskids_leads');
}

export interface StageAdvanceResult {
  advanced: boolean;
  from?: PipelineStage;
  to?: PipelineStage;
  error?: string;
}

export interface PipelineCycleResult {
  evaluated: number;
  advanced: number;
  errors: number;
  details: Array<{
    leadId: string;
    currentStage: string;
    result: StageAdvanceResult;
  }>;
}

export type PipelineManagerDeps = {
  tenantSlug?: string;
};

export class PipelineManagerService {
  private readonly rules: PipelineRule[];
  private readonly tenantSlug: string;

  constructor(deps: PipelineManagerDeps | string = {}) {
    const resolved = typeof deps === 'string' ? { tenantSlug: deps } : deps;

    this.tenantSlug = resolved.tenantSlug ?? 'peskids';
    this.rules = buildPipelineRules({
      supabase: supabaseServer(),
      tenantSlug: this.tenantSlug,
    });
  }

  static readonly PIPELINE_STAGES: PipelineStage[] = [
    'New Lead',
    'Contacted',
    'Trial Class',
    'Enrolled',
    'Active Student',
    'Renewal',
  ];

  private stageIndex(stage: string): number {
    return PipelineManagerService.PIPELINE_STAGES.indexOf(stage as PipelineStage);
  }

  /**
   * Auto-followup (+ Twenty Task via createFollowup for contact_type: 'lead')
   * the moment a lead enters the Renewal stage. Never blocks the stage
   * advance itself — a CRM/notify failure here is logged, not thrown.
   */
  private async notifyRenewalDue(leadId: string): Promise<void> {
    if (!isPeskidsRenewalReminderEnabled()) return;

    try {
      const due = new Date();
      due.setDate(due.getDate() + 1);
      const followup = await createFollowup({
        contact_id: leadId,
        contact_type: 'lead',
        type: 'call',
        due_date: due.toISOString().slice(0, 10),
        notes: 'Auto: alumno activo cerca de renovación — confirmar continuidad',
      });
      void emitLeadRenewalDue({ leadId, followupId: followup.id }).catch((err: unknown) => {
        console.warn('[pipeline-manager] lead.renewal_due emit failed', {
          lead_id: leadId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (err) {
      console.warn('[pipeline-manager] renewal followup failed', {
        lead_id: leadId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Read commercial stage from public.leads.status (source of truth). */
  async getCurrentStage(leadId: string): Promise<PipelineStage> {
    const { data } = await supabaseServer()
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .eq('tenant_id', this.tenantSlug)
      .maybeSingle();

    if (!data?.status) return 'New Lead';

    return LOCAL_STATUS_TO_PIPELINE_STAGE[data.status] ?? 'New Lead';
  }

  /** Persist stage on public.leads; mirror platform row. */
  private async advanceStage(leadId: string, newStage: PipelineStage): Promise<void> {
    const localStatus = PIPELINE_STAGE_TO_LOCAL_STATUS[newStage];

    const { data: lead, error } = await supabaseServer()
      .from('leads')
      .update({ status: localStatus })
      .eq('id', leadId)
      .eq('tenant_id', this.tenantSlug)
      .select('email')
      .maybeSingle();

    if (error) throw error;

    if (lead) {
      await platformPeskidsLeads()
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('tenant_slug', this.tenantSlug)
        .or(`lead_id.eq.${leadId},email.eq.${lead.email}`);
    }
  }

  /**
   * Evaluate pipeline rules for a local lead UUID.
   * Primary key: public.leads.id.
   */
  async evaluateAndAdvance(leadId: string): Promise<StageAdvanceResult> {
    const { data: leadRow, error: leadError } = await supabaseServer()
      .from('leads')
      .select('id, status')
      .eq('id', leadId)
      .eq('tenant_id', this.tenantSlug)
      .maybeSingle();

    if (leadError || !leadRow) {
      return { advanced: false, error: `Lead not found: ${leadId}` };
    }

    if (leadRow.status === 'archived') {
      return { advanced: false };
    }

    const currentStage = LOCAL_STATUS_TO_PIPELINE_STAGE[leadRow.status] ?? 'New Lead';
    const currentIdx = this.stageIndex(currentStage);
    if (currentIdx === -1) {
      return { advanced: false, error: `Unknown stage: ${currentStage}` };
    }
    if (currentIdx >= PipelineManagerService.PIPELINE_STAGES.length - 1) {
      return { advanced: false };
    }

    const applicableRules = this.rules.filter((rule) => rule.currentStage === currentStage);

    for (const rule of applicableRules) {
      try {
        const met = await rule.condition(leadId);
        if (!met) continue;

        const nextIdx = this.stageIndex(rule.nextStage);
        if (nextIdx <= currentIdx) continue;

        await this.advanceStage(leadId, rule.nextStage);
        if (rule.nextStage === 'Renewal') {
          await this.notifyRenewalDue(leadId);
        }
        return { advanced: true, from: currentStage, to: rule.nextStage };
      } catch (err) {
        return {
          advanced: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    return { advanced: false };
  }

  /** Bulk evaluation over public.leads. */
  async executePipelineCycle(): Promise<PipelineCycleResult> {
    const result: PipelineCycleResult = {
      evaluated: 0,
      advanced: 0,
      errors: 0,
      details: [],
    };

    const { data, error } = await supabaseServer()
      .from('leads')
      .select('id, status')
      .eq('tenant_id', this.tenantSlug)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(`Pipeline cycle failed: ${error.message}`);
    }

    for (const row of data ?? []) {
      result.evaluated++;
      const currentStage = await this.getCurrentStage(row.id);
      const advanceResult = await this.evaluateAndAdvance(row.id);

      result.details.push({
        leadId: row.id,
        currentStage,
        result: advanceResult,
      });

      if (advanceResult.advanced) {
        result.advanced++;
      } else if (advanceResult.error) {
        result.errors++;
      }
    }

    return result;
  }
}
