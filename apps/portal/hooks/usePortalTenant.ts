"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { fetchPortalTenant, tenantSlugFromUserMetadata } from "@/lib/tenant";
import type { PortalTenantPayload } from "@/types";

export function usePortalTenant(): {
  data: PortalTenantPayload | undefined;
  error: Error | undefined;
  isLoading: boolean;
  reload: () => void;
} {
  const [data, setData] = useState<PortalTenantPayload | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(undefined);

    void (async () => {
      try {
        const supabase = createClient();
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          throw new Error("No hay sesión");
        }
        const slug = tenantSlugFromUserMetadata(sessionData.session.user);
        const payload = await fetchPortalTenant(
          sessionData.session.access_token,
          slug,
        );
        if (!cancelled) {
          setData(payload);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e : new Error("Error al cargar"));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    data,
    error,
    isLoading,
    reload: () => setTick((t) => t + 1),
  };
}
