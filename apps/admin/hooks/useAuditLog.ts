'use client';

import useSWR from 'swr';
import type { AuditLogEntry } from '@/lib/types';

type AuditResponse = {
  entries: AuditLogEntry[];
  buckets: { date: string; count: number }[];
};

async function fetchAudit(): Promise<AuditResponse> {
  const res = await fetch('/api/audit-log', { credentials: 'same-origin' });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: string }).error)
        : 'Failed to load audit log';
    throw new Error(msg);
  }
  return data as AuditResponse;
}

export function useAuditLog(): {
  data: AuditResponse | undefined;
  error: Error | undefined;
  isLoading: boolean;
  mutate: () => void;
} {
  const { data, error, isLoading, mutate } = useSWR<AuditResponse>(['audit-log'], fetchAudit, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });
  return { data, error: error as Error | undefined, isLoading, mutate };
}
