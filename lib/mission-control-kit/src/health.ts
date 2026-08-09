import type { HealthTone } from './types.js';

export type GenericStatusHealth = {
  tone: HealthTone;
  label: string;
};

/** Map common lifecycle statuses to UI tone — no invented scores. */
export function healthFromLifecycleStatus(status: string): GenericStatusHealth {
  const normalized = status.trim().toLowerCase();
  switch (normalized) {
    case 'active':
    case 'won':
    case 'healthy':
    case 'ok':
    case 'running':
      return { tone: 'healthy', label: status };
    case 'prospecting':
    case 'qualification':
    case 'proposal':
    case 'negotiation':
    case 'provisioning':
    case 'warning':
    case 'pending':
    case 'busy':
      return { tone: 'warning', label: status };
    case 'failed':
    case 'lost':
    case 'critical':
    case 'error':
      return { tone: 'critical', label: status };
    default:
      return { tone: 'unknown', label: status || 'unknown' };
  }
}
