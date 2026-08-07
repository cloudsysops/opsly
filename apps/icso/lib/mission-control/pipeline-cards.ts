import {
  healthFromLifecycleStatus,
  redactPiiFromNotes,
  sanitizeEntityCard,
  type SanitizedEntityCard,
} from '@intcloudsysops/mission-control-kit';
import { icsoSupabaseServer, isIcsoSupabaseConfigured, TENANT_SLUG } from '@/lib/supabase-server';
import type { IcsoDealStage } from '@/lib/icso-pipeline-stages';

export type IcsoPipelineCard = SanitizedEntityCard & {
  stage: IcsoDealStage | string;
  healthTone: ReturnType<typeof healthFromLifecycleStatus>['tone'];
  notesPreview: string;
};

export async function listIcsoPipelineCards(limit = 40): Promise<{
  cards: IcsoPipelineCard[];
  source: string;
  configured: boolean;
  error?: string;
}> {
  if (!isIcsoSupabaseConfigured()) {
    return {
      cards: [],
      source: 'none',
      configured: false,
      error: 'Supabase no configurado — empty state (sin mocks).',
    };
  }

  try {
    const client = icsoSupabaseServer();
    const { data, error } = await client
      .from('intcloudsysops_deals')
      .select('id, name, stage, notes, updated_at, account_id')
      .eq('tenant_slug', TENANT_SLUG)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { cards: [], source: 'supabase', configured: true, error: error.message };
    }

    const cards: IcsoPipelineCard[] = (data ?? []).map((row) => {
      const stage = String(row.stage ?? 'unknown');
      const health = healthFromLifecycleStatus(stage);
      const base = sanitizeEntityCard({
        id: String(row.id),
        title: String(row.name ?? row.id),
        subtitle: `stage=${stage}`,
        status: stage,
        updatedAt: row.updated_at ? String(row.updated_at) : null,
      });
      return {
        ...base,
        stage,
        healthTone: health.tone,
        notesPreview: redactPiiFromNotes(String(row.notes ?? '')),
      };
    });

    return { cards, source: 'intcloudsysops_deals', configured: true };
  } catch (e) {
    return {
      cards: [],
      source: 'supabase',
      configured: true,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
