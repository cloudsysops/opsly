import { icsoSupabaseServer, TENANT_SLUG } from '@/lib/supabase-server';

export type PersistIcsoLeadInput = {
  name: string;
  email: string;
  message: string;
  sourceForm?: string;
  twentyPersonId?: string;
  twentyOpportunityId?: string;
};

export type PersistIcsoLeadResult = {
  accountId: string;
  contactId: string;
  dealId: string;
};

const INITIAL_DEAL_STAGE = 'prospecting';

export async function persistIcsoLead(
  input: PersistIcsoLeadInput
): Promise<PersistIcsoLeadResult> {
  const client = icsoSupabaseServer();

  const { data: account, error: accountError } = await client
    .from('intcloudsysops_accounts')
    .insert({
      tenant_slug: TENANT_SLUG,
      name: input.name.trim(),
      account_type: 'prospect',
      status: 'active',
      billing_email: input.email.trim(),
      notes: input.message.trim(),
    })
    .select('id')
    .single();

  if (accountError || !account) {
    throw new Error(accountError?.message ?? 'Failed to create ICSO account');
  }

  const { data: contact, error: contactError } = await client
    .from('intcloudsysops_contacts')
    .insert({
      tenant_slug: TENANT_SLUG,
      account_id: account.id,
      email: input.email.trim(),
      full_name: input.name.trim(),
      role: 'decision_maker',
      status: 'active',
      notes: input.message.trim(),
      source_form: input.sourceForm ?? 'ICSO Contact Form',
      twenty_person_id: input.twentyPersonId ?? null,
    })
    .select('id')
    .single();

  if (contactError || !contact) {
    throw new Error(contactError?.message ?? 'Failed to create ICSO contact');
  }

  const { data: deal, error: dealError } = await client
    .from('intcloudsysops_deals')
    .insert({
      tenant_slug: TENANT_SLUG,
      account_id: account.id,
      title: `ICSO — ${input.name.trim()}`,
      stage: INITIAL_DEAL_STAGE,
      notes: input.message.trim(),
      twenty_opportunity_id: input.twentyOpportunityId ?? null,
    })
    .select('id')
    .single();

  if (dealError || !deal) {
    throw new Error(dealError?.message ?? 'Failed to create ICSO deal');
  }

  return {
    accountId: account.id,
    contactId: contact.id,
    dealId: deal.id,
  };
}
