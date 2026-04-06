import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { fetchPortalTenant } from "@/lib/tenant";
import type { PortalTenantPayload } from "@/types";

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
