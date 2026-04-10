import { getServiceClient } from "../supabase";

export interface TenantWebhook {
  id: string;
  tenant_slug: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateWebhookInput = {
  tenant_slug: string;
  url: string;
  secret: string;
  events: string[];
};

const TABLE = "tenant_webhooks";
const SCHEMA = "platform";

export async function listWebhooks(tenantSlug: string): Promise<TenantWebhook[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select("*")
    .eq("tenant_slug", tenantSlug)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TenantWebhook[];
}

export async function createWebhook(input: CreateWebhookInput): Promise<TenantWebhook> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TenantWebhook;
}

export async function deleteWebhook(id: string, tenantSlug: string): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("tenant_slug", tenantSlug); // enforce ownership

  if (error) throw new Error(error.message);
}

export async function listActiveWebhooksByEvent(
  tenantSlug: string,
  event: string,
): Promise<TenantWebhook[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .schema(SCHEMA)
    .from(TABLE)
    .select("*")
    .eq("tenant_slug", tenantSlug)
    .eq("active", true)
    .contains("events", [event]);

  if (error) throw new Error(error.message);
  return (data ?? []) as TenantWebhook[];
}
