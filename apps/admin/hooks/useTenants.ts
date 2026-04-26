'use client';

import useSWR from 'swr';
import { getTenants, type ListTenantsParams } from '@/lib/api-client';
import type { TenantsListResponse } from '@/lib/types';

export function useTenants(params: ListTenantsParams): {
  data: TenantsListResponse | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => void;
} {
  const key = ['tenants', params.page, params.limit, params.plan ?? '', params.status ?? ''];
  const { data, error, isLoading, mutate } = useSWR<TenantsListResponse>(
    key,
    () => getTenants(params),
    {
      revalidateOnFocus: false,
    }
  );
  return { data, error: error as Error | undefined, isLoading, mutate };
}
