'use client';

import useSWR from 'swr';
import { getTenantModules } from '@/lib/api-client';
import type { TenantModulesResponse } from '@/lib/types';

const IN_PROGRESS_STATUSES = new Set(['queued', 'provisioning']);

export function useTenantModules(slug: string | undefined): {
  data: TenantModulesResponse | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => void;
} {
  const { data, error, isLoading, mutate } = useSWR<TenantModulesResponse>(
    slug ? ['tenant-modules', slug] : null,
    () => getTenantModules(slug as string),
    {
      refreshInterval: (latest) => {
        const hasInProgress = latest?.modules.some((m) => IN_PROGRESS_STATUSES.has(m.status));
        return hasInProgress ? 5_000 : 30_000;
      },
      revalidateOnFocus: false,
    }
  );
  return { data, error: error as Error | undefined, isLoading, mutate };
}
