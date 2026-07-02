import { getGoHighLevelService } from '@intcloudsysops/services/gohighlevel';
import type { GoHighLevelService } from '@intcloudsysops/services/gohighlevel';
import { supabaseServer } from '@/lib/supabase';
import type { PipelineRule, PipelineStage } from '@/lib/agents/pipeline-rules';
import { buildPipelineRules } from '@/lib/agents/pipeline-rules';

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
    contactId: string;
    currentStage: string;
    result: StageAdvanceResult;
  }>;
}

export class PipelineManagerService {
  private ghlService: GoHighLevelService;
  private rules: PipelineRule[];
  private tenantSlug: string;

  constructor(tenantSlug = 'peskids') {
    this.ghlService = getGoHighLevelService();
    this.tenantSlug = tenantSlug;
    const db = supabaseServer();
    this.rules = buildPipelineRules({
      ghlService: this.ghlService,
      supabase: db,
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

  /** Read current stage from platform.peskids_leads for a GHL contact id. */
  async getCurrentStage(ghlContactId: string): Promise<PipelineStage> {
    const { data } = await platformPeskidsLeads()
      .select('stage')
      .eq('lead_id', ghlContactId)
      .eq('tenant_slug', this.tenantSlug)
      .maybeSingle();

    if (data && this.stageIndex((data as { stage: string }).stage) !== -1) {
      return (data as { stage: PipelineStage }).stage;
    }
    return 'New Lead';
  }

  /** Write stage to platform.peskids_leads and sync to GHL. */
  private async advanceStage(
    ghlContactId: string,
    newStage: PipelineStage
  ): Promise<void> {
    const ghlStageId = PipelineManagerService.PESKIDS_TO_GHL_STAGE[newStage];
    if (!ghlStageId) {
      throw new Error(`No GHL stage ID mapped for ${newStage}`);
    }

    await platformPeskidsLeads()
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('lead_id', ghlContactId)
      .eq('tenant_slug', this.tenantSlug);

    await this.ghlService.updateOpportunityStage(
      this.tenantSlug,
      ghlContactId,
      ghlStageId
    );
  }

  /** For a given GHL contact, evaluate rules and advance if conditions met. */
  async evaluateAndAdvance(ghlContactId: string): Promise<StageAdvanceResult> {
    const currentStage = await this.getCurrentStage(ghlContactId);

    const currentIdx = this.stageIndex(currentStage);
    if (currentIdx === -1) {
      return { advanced: false, error: `Unknown stage: ${currentStage}` };
    }
    if (currentIdx >= PipelineManagerService.PIPELINE_STAGES.length - 1) {
      return { advanced: false };
    }

    const applicableRules = this.rules.filter(
      (r) => r.currentStage === currentStage
    );

    for (const rule of applicableRules) {
      try {
        const met = await rule.condition(ghlContactId);
        if (!met) continue;

        const nextIdx = this.stageIndex(rule.nextStage);
        if (nextIdx <= currentIdx) continue;

        await this.advanceStage(ghlContactId, rule.nextStage);
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

  /** Bulk: evaluate all GHL contacts, advance as needed. */
  async executePipelineCycle(): Promise<PipelineCycleResult> {
    const result: PipelineCycleResult = {
      evaluated: 0,
      advanced: 0,
      errors: 0,
      details: [],
    };

    try {
      const contactsResponse = await this.ghlService.getContacts(this.tenantSlug, {
        limit: 100,
      });

      for (const contact of contactsResponse.data) {
        if (!contact.id) continue;
        result.evaluated++;

        const currentStage = await this.getCurrentStage(contact.id);
        const advanceResult = await this.evaluateAndAdvance(contact.id);

        result.details.push({
          contactId: contact.id,
          currentStage,
          result: advanceResult,
        });

        if (advanceResult.advanced) {
          result.advanced++;
        } else if (advanceResult.error) {
          result.errors++;
        }
      }
    } catch (err) {
      throw new Error(
        `Pipeline cycle failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    return result;
  }
}
