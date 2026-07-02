import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type IcsoDealStage,
  isValidStageTransition,
} from '@/lib/icso-pipeline-stages';
import { icsoSupabaseServer, TENANT_SLUG } from '@/lib/supabase-server';

export type IcsoPipelineRule = {
  currentStage: IcsoDealStage;
  nextStage: IcsoDealStage;
  description: string;
  condition: (dealId: string, client: SupabaseClient) => Promise<boolean>;
};

async function hasCompletedFollowupForDeal(
  dealId: string,
  client: SupabaseClient
): Promise<boolean> {
  const { count, error } = await client
    .from('intcloudsysops_followups')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_slug', TENANT_SLUG)
    .eq('related_type', 'deal')
    .eq('related_id', dealId)
    .eq('status', 'completed');

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

async function hasOpenFollowupForDeal(
  dealId: string,
  client: SupabaseClient
): Promise<boolean> {
  const { count, error } = await client
    .from('intcloudsysops_followups')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_slug', TENANT_SLUG)
    .eq('related_type', 'deal')
    .eq('related_id', dealId)
    .in('status', ['open', 'in_progress']);

  if (error) {
    throw error;
  }

  return (count ?? 0) > 0;
}

export const ICSO_PIPELINE_RULES: IcsoPipelineRule[] = [
  {
    currentStage: 'prospecting',
    nextStage: 'qualification',
    description: 'Discovery follow-up completed',
    condition: hasCompletedFollowupForDeal,
  },
  {
    currentStage: 'qualification',
    nextStage: 'proposal',
    description: 'Qualification task completed and no open follow-ups',
    condition: async (dealId, client) => {
      const completed = await hasCompletedFollowupForDeal(dealId, client);
      if (!completed) {
        return false;
      }
      const open = await hasOpenFollowupForDeal(dealId, client);
      return !open;
    },
  },
];

export type PipelineAdvanceResult = {
  dealId: string;
  previousStage: IcsoDealStage;
  currentStage: IcsoDealStage;
  advanced: boolean;
  ruleDescription?: string;
};

export class IcsoPipelineService {
  constructor(private readonly client: SupabaseClient = icsoSupabaseServer()) {}

  async getDealStage(dealId: string): Promise<IcsoDealStage | null> {
    const { data, error } = await this.client
      .from('intcloudsysops_deals')
      .select('stage')
      .eq('tenant_slug', TENANT_SLUG)
      .eq('id', dealId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data?.stage as IcsoDealStage | undefined) ?? null;
  }

  async advanceDealStage(
    dealId: string,
    nextStage: IcsoDealStage
  ): Promise<PipelineAdvanceResult> {
    const currentStage = await this.getDealStage(dealId);
    if (!currentStage) {
      throw new Error(`ICSO deal not found: ${dealId}`);
    }

    if (!isValidStageTransition(currentStage, nextStage)) {
      return {
        dealId,
        previousStage: currentStage,
        currentStage,
        advanced: false,
      };
    }

    const { error } = await this.client
      .from('intcloudsysops_deals')
      .update({ stage: nextStage, updated_at: new Date().toISOString() })
      .eq('tenant_slug', TENANT_SLUG)
      .eq('id', dealId);

    if (error) {
      throw error;
    }

    return {
      dealId,
      previousStage: currentStage,
      currentStage: nextStage,
      advanced: true,
    };
  }

  async evaluateAndAdvance(dealId: string): Promise<PipelineAdvanceResult> {
    const currentStage = await this.getDealStage(dealId);
    if (!currentStage) {
      throw new Error(`ICSO deal not found: ${dealId}`);
    }

    const rule = ICSO_PIPELINE_RULES.find((item) => item.currentStage === currentStage);
    if (!rule) {
      return {
        dealId,
        previousStage: currentStage,
        currentStage,
        advanced: false,
      };
    }

    const shouldAdvance = await rule.condition(dealId, this.client);
    if (!shouldAdvance) {
      return {
        dealId,
        previousStage: currentStage,
        currentStage,
        advanced: false,
        ruleDescription: rule.description,
      };
    }

    const result = await this.advanceDealStage(dealId, rule.nextStage);
    return {
      ...result,
      ruleDescription: rule.description,
    };
  }
}

export function createIcsoPipelineService(): IcsoPipelineService {
  return new IcsoPipelineService();
}
