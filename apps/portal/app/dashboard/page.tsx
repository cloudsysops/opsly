import type { ReactElement } from "react";
import { redirect } from "next/navigation";
import { ModeSelector } from "@/components/mode-selector";
import { PortalShell } from "@/components/portal-shell";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function DashboardSelectorPage(): Promise<ReactElement> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <PortalShell title="Elige cómo trabajar">
      <ModeSelector />
    </PortalShell>
  );
}
