'use client';

import type { ReactElement } from 'react';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';

const CPU_INCIDENT_THRESHOLD = 90;

export function IncidentVignette(): ReactElement | null {
  const { data } = useSystemMetrics();
  const cpu = data?.cpu_percent ?? 0;
  if (cpu < CPU_INCIDENT_THRESHOLD) {
    return null;
  }
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[5] bg-[radial-gradient(circle_at_center,transparent_55%,rgba(239,68,68,0.14)_100%)]"
      aria-hidden
      role="presentation"
    />
  );
}
