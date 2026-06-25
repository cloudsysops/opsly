import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import type { updateTenantSettingsSchema } from '@/lib/validation/tenant-settings.schema';
import type { z } from 'zod';

type TenantSettingsRow = Database['public']['Tables']['tenant_settings']['Row'];

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

export async function getTenantSettings(): Promise<TenantSettingsRow> {
  const existing = await supabaseServer()
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', tenantSlug())
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const created = await supabaseServer()
    .from('tenant_settings')
    .insert({ tenant_id: tenantSlug() })
    .select('*')
    .single();

  if (created.error) throw created.error;
  return created.data;
}

export async function updateTenantSettings(
  input: z.infer<typeof updateTenantSettingsSchema>
): Promise<TenantSettingsRow> {
  await getTenantSettings();

  const patch: Database['public']['Tables']['tenant_settings']['Update'] = {
    updated_at: new Date().toISOString(),
  };
  if (input.academy_name !== undefined) patch.academy_name = input.academy_name;
  if (input.sede_label !== undefined) patch.sede_label = input.sede_label;
  if (input.support_email !== undefined) patch.support_email = input.support_email;
  if (input.support_phone !== undefined) patch.support_phone = input.support_phone;
  if (input.default_modality !== undefined) patch.default_modality = input.default_modality;
  if (input.default_capacity !== undefined) patch.default_capacity = input.default_capacity;
  if (input.default_price_cents !== undefined) patch.default_price_cents = input.default_price_cents;

  const { data, error } = await supabaseServer()
    .from('tenant_settings')
    .update(patch)
    .eq('tenant_id', tenantSlug())
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
