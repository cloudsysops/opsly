import { getGoHighLevelService } from '@intcloudsysops/services/gohighlevel';
import type { GoHighLevelService } from '@intcloudsysops/services/gohighlevel';
import { isPeskidsGhlEnabled } from '@intcloudsysops/services/twenty';
import { supabaseServer } from '@/lib/supabase';
import type { PipelineRule, PipelineStage } from '@/lib/agents/pipeline-rules';
import {
  buildPipelineRules,
  LOCAL_STATUS_TO_PIPELINE_STAGE,
  PIPELINE_STAGE_TO_LOCAL_STATUS,
  type LeadPipelineContext,
} from '@/lib/agents/pipeline-rules';

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
  ghlService?: GoHighLevelService | null;
  ghlSyncEnabled?: boolean;
};

export class PipelineManagerService {
  private readonly ghlService: GoHighLevelService | null;
  private readonly ghlSyncEnabled: boolean;
  private readonly rules: PipelineRule[];
  private readonly tenantSlug: string;

  constructor(deps: PipelineManagerDeps | string = {}) {
    const resolved =
      typeof deps === 'string'
        ? { tenantSlug: deps }
        : deps;

    this.tenantSlug = resolved.tenantSlug ?? 'peskids';
    this.ghlService = resolved.ghlService ?? getGoHighLevelService();
    this.ghlSyncEnabled =
      resolved.ghlSyncEnabled ?? (isPeskidsGhlEnabled() && Boolean(this.ghlService));
    const db = supabaseServer();
    this.rules = buildPipelineRules({
      supabase: db,
      tenantSlug: this.tenantSlug,
      ghlService: this.ghlSyncEnabled ? this.ghlService : null,
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

  /** Legacy GHL stage ids — used only when PESKIDS_GHL_ENABLED=true */
  static readonly PESKIDS_TO_GHL_STAGE: Record<PipelineStage, string> = {
    'New Lead': 'f4c7365b-efe8-4d33-9559-c7f06881f172',
    Contacted: '75742c84-9063-4539-b755-b09bfdeb6346',
    'Trial Class': '13f095d8-4c87-4637-a6f7-b8d2d294ad0b',
    Enrolled: 'd69d8656-1836-4d48-8a83-5268895c5c74',
    'Active Student': 'c9b615f7-b4da-416c-a3b1-28be6da1d063',
    Renewal: 'e9c02a74-f298-48a4-a1e5-1c952f950531',
  };

  private stageIndex(stage: string): number {
    return PipelineManagerService.PIPELINE_STAGES.indexOf(stage as PipelineStage);
  }

  private async loadLeadContext(leadId: string): Promise<LeadPipelineContext | null> {
    const { data, error } = await supabaseServer()
      .from('leads')
      .select('id, email, phone, ghl_contact_id')
      .eq('id', leadId)
      .eq('tenant_id', this.tenantSlug)
      .maybeSingle();

    if (error || !data) return null;

    return {
      leadId: data.id,
      email: data.email,
      phone: data.phone,
      ghlContactId: data.ghl_contact_id,
    };
  }

  /** Read current stage from public.leads.status */
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

  /** Write stage to public.leads; mirror platform row; optional legacy GHL sync */
  private async advanceStage(leadId: string, newStage: PipelineStage): Promise<void> {
    const localStatus = PIPELINE_STAGE_TO_LOCAL_STATUS[newStage];

    const { error } = await supabaseServer()
      .from('leads')
      .update({ status: localStatus })
      .eq('id', leadId)
      .eq('tenant_id', this.tenantSlug);

    if (error) throw error;

    const lead = await this.loadLeadContext(leadId);
    if (lead) {
      await platformPeskidsLeads()
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('tenant_slug', this.tenantSlug)
        .or(`lead_id.eq.${leadId},email.eq.${lead.email}`);
    }

    if (!lead?.ghlContactId || !this.ghlSyncEnabled || !this.ghlService) {
      return;
    }

    const ghlStageId = PipelineManagerService.PESKIDS_TO_GHL_STAGE[newStage];
    if (!ghlStageId) return;

    await this.ghlService.updateOpportunityStage(
      this.tenantSlug,
      lead.ghlContactId,
      ghlStageId
    );
  }

  /** Evaluate rules for a local lead UUID and advance if conditions are met. */
  async evaluateAndAdvance(leadId: string): Promise<StageAdvanceResult> {
    const lead = await this.loadLeadContext(leadId);
    if (!lead) {
      return { advanced: false, error: `Lead not found: ${leadId}` };
    }

    const { data: statusRow } = await supabaseServer()
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .eq('tenant_id', this.tenantSlug)
      .maybeSingle();

    if (statusRow?.status === 'archived') {
      return { advanced: false };
    }

    const currentStage = await this.getCurrentStage(leadId);
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
        const met = await rule.condition(lead);
        if (!met) continue;

        const nextIdx = this.stageIndex(rule.nextStage);
        if (nextIdx <= currentIdx) continue;

        await this.advanceStage(leadId, rule.nextStage);
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

  /** Bulk: evaluate public.leads for the tenant (no GHL contact list required). */
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
