"use client";

import useSWR from "swr";
import { getTenant } from "@/lib/api-client";
import type { TenantDetailResponse } from "@/lib/types";

export function useTenant(
  idOrSlug: string | undefined,
): {
  data: TenantDetailResponse | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => void;
} {
  const { data, error, isLoading, mutate } = useSWR<TenantDetailResponse>(
    idOrSlug ? ["tenant", idOrSlug] : null,
    () => getTenant(idOrSlug as string),
    {
      refreshInterval: 30_000,
      revalidateOnFocus: false,
    },
  );
  return { data, error: error as Error | undefined, isLoading, mutate };
}
