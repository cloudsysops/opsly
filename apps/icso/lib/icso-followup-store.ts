import type { SupabaseClient } from '@supabase/supabase-js';
import { icsoSupabaseServer, TENANT_SLUG } from '@/lib/supabase-server';

export type IcsoStaleDealRecord = {
  dealId: string;
  accountId: string;
  contactId: string;
  contactEmail: string | null;
  contactName: string;
  stage: string;
  createdAt: string;
};

export type CreateIcsoFollowupInput = {
  relatedType: 'account' | 'contact' | 'deal' | 'feedback' | 'task';
  relatedId: string;
  title: string;
  description?: string;
  dueAt: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
};

export interface IcsoFollowupStore {
  findStaleDeals(hoursThreshold: number): Promise<IcsoStaleDealRecord[]>;
  createFollowup(input: CreateIcsoFollowupInput): Promise<{ id: string }>;
}

export class SupabaseIcsoFollowupStore implements IcsoFollowupStore {
  constructor(private readonly client: SupabaseClient = icsoSupabaseServer()) {}

  async findStaleDeals(hoursThreshold: number): Promise<IcsoStaleDealRecord[]> {
    const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();

    const { data: deals, error: dealsError } = await this.client
      .from('intcloudsysops_deals')
      .select('id, account_id, stage, created_at')
      .eq('tenant_slug', TENANT_SLUG)
      .eq('stage', 'prospecting')
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(100);

    if (dealsError) {
      throw dealsError;
    }

    if (!deals?.length) {
      return [];
    }

    const accountIds = [...new Set(deals.map((deal) => deal.account_id))];
    const { data: contacts, error: contactsError } = await this.client
      .from('intcloudsysops_contacts')
      .select('id, account_id, email, full_name')
      .eq('tenant_slug', TENANT_SLUG)
      .in('account_id', accountIds);

    if (contactsError) {
      throw contactsError;
    }

    const contactByAccount = new Map(
      (contacts ?? []).map((contact) => [contact.account_id, contact])
    );

    const stale: IcsoStaleDealRecord[] = [];
    for (const deal of deals) {
      const contact = contactByAccount.get(deal.account_id);
      if (!contact) {
        continue;
      }

      const { count, error: followupError } = await this.client
        .from('intcloudsysops_followups')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_slug', TENANT_SLUG)
        .eq('related_type', 'deal')
        .eq('related_id', deal.id)
        .in('status', ['open', 'in_progress']);

      if (followupError) {
        throw followupError;
      }

      if ((count ?? 0) > 0) {
        continue;
      }

      stale.push({
        dealId: deal.id,
        accountId: deal.account_id,
        contactId: contact.id,
        contactEmail: contact.email,
        contactName: contact.full_name,
        stage: deal.stage,
        createdAt: deal.created_at ?? new Date().toISOString(),
      });
    }

    return stale;
  }

  async createFollowup(input: CreateIcsoFollowupInput): Promise<{ id: string }> {
    const { data, error } = await this.client
      .from('intcloudsysops_followups')
      .insert({
        tenant_slug: TENANT_SLUG,
        related_type: input.relatedType,
        related_id: input.relatedId,
        title: input.title,
        description: input.description ?? null,
        due_at: input.dueAt,
        priority: input.priority ?? 'medium',
        status: 'open',
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create ICSO follow-up');
    }

    return { id: data.id };
  }
}

export function createSupabaseIcsoFollowupStore(): IcsoFollowupStore {
  return new SupabaseIcsoFollowupStore();
}
