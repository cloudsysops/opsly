export type EntitlementSource = 'manual' | 'plan_default' | 'package_default';

export interface TenantEntitlement {
  id: string;
  tenant_id: string;
  module_id: string;
  enabled: boolean;
  source: EntitlementSource;
  granted_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GrantEntitlementInput {
  moduleId: string;
  source?: EntitlementSource;
  grantedBy?: string;
  metadata?: Record<string, unknown>;
}

export class TenantNotFoundError extends Error {
  constructor(tenantSlug: string) {
    super(`Tenant not found: ${tenantSlug}`);
    this.name = 'TenantNotFoundError';
  }
}
