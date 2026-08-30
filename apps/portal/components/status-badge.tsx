import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';

export type ServiceHealth = 'healthy' | 'unhealthy' | 'unknown';

type StatusBadgeProps = {
  state: ServiceHealth;
  label?: string;
  className?: string;
};

function defaultLabel(state: ServiceHealth): string {
  if (state === 'healthy') {
    return 'healthy';
  }
  if (state === 'unhealthy') {
    return 'unhealthy';
  }
  return 'unknown';
}

export function StatusBadge({ state, label, className }: StatusBadgeProps): ReactElement {
  const text = label ?? defaultLabel(state);
  const healthy = state === 'healthy';
  const unhealthy = state === 'unhealthy';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium',
        healthy && 'border-ops-green/40 bg-ops-green/10 text-ops-green',
        unhealthy && 'border-ops-red/40 bg-ops-red/10 text-ops-red',
        !healthy && !unhealthy && 'border-ops-border bg-ops-surface text-ops-gray',
        className
      )}
    >
      {text}
    </span>
  );
}

export function healthFromReachable(reachable: boolean): ServiceHealth {
  return reachable ? 'healthy' : 'unhealthy';
}
