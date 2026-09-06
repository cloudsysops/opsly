import { supabaseServer } from '@/lib/supabase';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

/** Returns an existing lead id for the same email so public intake does not duplicate. */
export async function findLeadIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const slug = tenantSlug();
  const client = supabaseServer();
  const publicLookup = await client
    .from('leads')
    .select('id')
    .eq('tenant_id', slug)
    .ilike('email', normalized)
    .limit(1)
    .maybeSingle();
  if (publicLookup.data && typeof publicLookup.data.id === 'string') {
    return publicLookup.data.id;
  }
  const platform = client as unknown as {
    schema: (name: string) => {
      from: (table: string) => ReturnType<typeof client.from>;
    };
  };
  const platformLookup = await platform
    .schema('platform')
    .from('peskids_leads')
    .select('id')
    .eq('tenant_slug', slug)
    .ilike('email', normalized)
    .limit(1)
    .maybeSingle();
  if (platformLookup.data && typeof platformLookup.data.id === 'string') {
    return platformLookup.data.id;
  }
  return null;
}
