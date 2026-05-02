'use client';

import useSWR from 'swr';
import { demoSystemMetrics, getSystemMetrics } from '@/lib/api-client';
import type { SystemMetricsResponse } from '@/lib/types';

const REFRESH_MS = 30_000;

export function useSystemMetrics(): {
  data: SystemMetricsResponse | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => void;
} {
  const { data, error, isLoading, mutate } = useSWR<SystemMetricsResponse>(
    ['system-metrics'],
    () => getSystemMetrics(),
    {
      fallbackData: demoSystemMetrics(),
      refreshInterval: REFRESH_MS,
      revalidateOnFocus: false,
    }
  );
  return {
    data: data ?? demoSystemMetrics(),
    error: error as Error | undefined,
    isLoading: isLoading && data === undefined,
    mutate,
  };
}
