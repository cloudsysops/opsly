'use client';

import useSWR from 'swr';
import { getMetrics } from '@/lib/api-client';
import type { MetricsResponse } from '@/lib/types';

export function useMetrics(): {
  data: MetricsResponse | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => void;
} {
  const { data, error, isLoading, mutate } = useSWR<MetricsResponse>(
    ['metrics'],
    () => getMetrics(),
    {
      refreshInterval: 60_000,
      revalidateOnFocus: false,
    }
  );
  return { data, error: error as Error | undefined, isLoading, mutate };
}
