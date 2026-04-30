import type { IntentRequest } from '../types.js';

const TENANT_SLUG_REGEX = /^[a-z0-9-]{3,64}$/;

function readMetadataTenantSlug(metadata: Record<string, unknown> | undefined): string | undefined {
  if (!metadata) {
    return undefined;
  }
  const value = metadata.tenant_slug;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function assertTenantAwarePermissions(req: IntentRequest): void {
  const tenantSlug = req.tenant_slug?.trim();
  if (!tenantSlug) {
    // Backward-compatible: legacy internal intents may omit tenant_slug.
    return;
  }
  if (!TENANT_SLUG_REGEX.test(tenantSlug)) {
    throw new Error(`tenant-aware permissions: invalid tenant_slug (${tenantSlug})`);
  }

  const metadataTenantSlug = readMetadataTenantSlug(req.metadata);
  if (metadataTenantSlug && metadataTenantSlug !== tenantSlug) {
    throw new Error(
      `tenant-aware permissions: metadata tenant mismatch (${metadataTenantSlug} != ${tenantSlug})`
    );
  }

  if (typeof req.context.tenant_slug === 'string' && req.context.tenant_slug !== tenantSlug) {
    throw new Error('tenant-aware permissions: context.tenant_slug mismatch');
  }
}
