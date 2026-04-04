"use client";

import useSWR from "swr";
import { getTenants } from "@/lib/api-client";

export function useFailedTenantCount(): {
  count: number | undefined;
  error: Error | undefined;
  isLoading: boolean;
} {
  const { data, error, isLoading } = useSWR(
    ["tenants-failed-count"],
    () => getTenants({ page: 1, limit: 1, status: "failed" }),
    { revalidateOnFocus: false, refreshInterval: 60_000 },
  );
  return {
    count: data?.total,
    error: error as Error | undefined,
    isLoading,
  };
}
