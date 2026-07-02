import {
  createSupabaseIcsoFollowupStore,
  type IcsoFollowupStore,
  type IcsoStaleDealRecord,
} from '@/lib/icso-followup-store';
import { createIcsoPipelineService, type IcsoPipelineService } from '@/lib/icso-pipeline.service';

export type IcsoFollowupServiceDeps = {
  store?: IcsoFollowupStore;
  pipeline?: IcsoPipelineService;
  staleHoursThreshold?: number;
};

export type IcsoFollowupRunResult = {
  staleDeals: IcsoStaleDealRecord[];
  followupsCreated: number;
  pipelineAdvanced: number;
};

function defaultDueAt(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

export class IcsoFollowupService {
  private readonly store: IcsoFollowupStore;
  private readonly pipeline: IcsoPipelineService;
  private readonly staleHoursThreshold: number;

  constructor(deps: IcsoFollowupServiceDeps = {}) {
    this.store = deps.store ?? createSupabaseIcsoFollowupStore();
    this.pipeline = deps.pipeline ?? createIcsoPipelineService();
    this.staleHoursThreshold = deps.staleHoursThreshold ?? 48;
  }

  async runStaleLeadFollowups(): Promise<IcsoFollowupRunResult> {
    const staleDeals = await this.store.findStaleDeals(this.staleHoursThreshold);
    let followupsCreated = 0;
    let pipelineAdvanced = 0;

    for (const deal of staleDeals) {
      await this.store.createFollowup({
        relatedType: 'deal',
        relatedId: deal.dealId,
        title: `Follow up: ${deal.contactName}`,
        description: `Stale prospecting deal for ${deal.contactEmail ?? 'unknown email'}`,
        dueAt: defaultDueAt(24),
        priority: 'high',
      });
      followupsCreated += 1;

      const advance = await this.pipeline.evaluateAndAdvance(deal.dealId);
      if (advance.advanced) {
        pipelineAdvanced += 1;
      }
    }

    return {
      staleDeals,
      followupsCreated,
      pipelineAdvanced,
    };
  }
}

export function createIcsoFollowupService(
  deps?: IcsoFollowupServiceDeps
): IcsoFollowupService {
  return new IcsoFollowupService(deps);
}
