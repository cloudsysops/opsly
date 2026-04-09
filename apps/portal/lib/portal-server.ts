import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { fetchPortalTenant, fetchPortalUsage } from "@/lib/tenant";
import type { PortalTenantPayload, PortalUsageSnapshot } from "@/types";

export async function requirePortalPayload(): Promise<PortalTenantPayload> {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    redirect("/login");
  }
  try {
    return await fetchPortalTenant(session.access_token);
  } catch {
    redirect("/login");
  }
}

/**
 * Sesión portal + métricas LLM (`GET /api/portal/usage`). Si la API de uso falla,
 * devuelve `null` por periodo sin invalidar el dashboard.
 */
export async function requirePortalPayloadWithUsage(): Promise<{
  payload: PortalTenantPayload;
  usage: PortalUsageSnapshot;
}> {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    redirect("/login");
  }
  const token = session.access_token;
  try {
    const payload = await fetchPortalTenant(token);
    const [today, month] = await Promise.all([
      fetchPortalUsage(token, "today").catch((): null => null),
      fetchPortalUsage(token, "month").catch((): null => null),
    ]);
    return { payload, usage: { today, month } };
  } catch {
    redirect("/login");
  }
}
