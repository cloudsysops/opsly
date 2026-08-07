/**
 * Health mapping for tenant cards — derived from Tenant.status only (no invented scores).
 */

import type { TenantStatus } from '@/lib/types';

export type MoonHealthTone = 'healthy' | 'warning' | 'critical' | 'unknown';

export type MoonTenantHealth = {
  tone: MoonHealthTone;
  label: string;
};

export function healthFromTenantStatus(status: TenantStatus): MoonTenantHealth {
  switch (status) {
    case 'active':
      return { tone: 'healthy', label: 'Activo' };
    case 'provisioning':
    case 'configuring':
    case 'deploying':
      return { tone: 'warning', label: 'En aprovisionamiento' };
    case 'suspended':
      return { tone: 'warning', label: 'Suspendido' };
    case 'failed':
      return { tone: 'critical', label: 'Fallido' };
    case 'deleted':
      return { tone: 'unknown', label: 'Eliminado' };
    default:
      return { tone: 'unknown', label: 'Desconocido' };
  }
}

/** Never expose owner_email or other PII on Moon global cards. */
export function sanitizeTenantForMoonCard(input: {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: TenantStatus;
  updated_at: string;
  created_at: string;
}): {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: TenantStatus;
  health: MoonTenantHealth;
  updated_at: string;
  created_at: string;
} {
  return {
    id: input.id,
    slug: input.slug,
    name: input.name,
    plan: input.plan,
    status: input.status,
    health: healthFromTenantStatus(input.status),
    updated_at: input.updated_at,
    created_at: input.created_at,
  };
}
