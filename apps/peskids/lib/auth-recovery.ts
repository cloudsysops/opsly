/** Recovery email targets and cross-app routing (shared Supabase project). */

import {
  buildRecoveryRedirectTo,
  forwardRecoveryToOrigin,
  inviteActivationPathFromUrl,
  isInviteLink,
  isRecoveryLink,
  metadataFromJwtAccessToken,
  resolveRecoveryTargetFromMetadata,
  type RecoveryTarget,
  type RecoveryRoutingConfig,
} from '@/lib/runtime/tenant-auth-routing';

import { ADMIN_APP_ORIGIN, PESKIDS_APP_ORIGIN, PORTAL_APP_ORIGIN } from './app-url';

const PESKIDS_TENANT_SLUG = 'peskids';
const PESKIDS_STAFF_ROLES = new Set(['owner', 'admin', 'support', 'teacher']);

function normalizeMetadataValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

const ROUTING_CONFIG: RecoveryRoutingConfig = {
  portal: {
    origin: PORTAL_APP_ORIGIN,
    updatePasswordPath: '/update-password',
  },
  platformAdmin: {
    origin: ADMIN_APP_ORIGIN,
    updatePasswordPath: '/update-password',
    tenantSlugs: ['intcloudsysops'],
  },
  tenantRules: [
    {
      tenantSlug: 'peskids',
      app: 'peskids_staff',
      origin: PESKIDS_APP_ORIGIN,
      staffRoles: ['owner', 'admin', 'support', 'teacher'],
      updatePasswordPath: '/admin/update-password',
      updatePasswordPathByRole: {
        support: '/support/update-password',
        teacher: '/teacher/update-password',
      },
    },
  ],
};

export type { RecoveryTarget };
export {
  buildRecoveryRedirectTo,
  forwardRecoveryToOrigin,
  inviteActivationPathFromUrl,
  isInviteLink,
  isRecoveryLink,
  metadataFromJwtAccessToken,
};

export function recoveryTargetFromMetadata(meta: Record<string, unknown>): RecoveryTarget {
  return resolveRecoveryTargetFromMetadata(meta, ROUTING_CONFIG);
}

/** Fills missing tenant/role so staff recovery started from Peskids stays on this app. */
export function metadataForPeskidsStaffRecovery(
  meta: Record<string, unknown>
): Record<string, unknown> {
  const tenantSlug = normalizeMetadataValue(meta.tenant_slug);
  const role = normalizeMetadataValue(meta.role);
  const next = { ...meta };

  if (!tenantSlug) {
    next.tenant_slug = PESKIDS_TENANT_SLUG;
  }
  if (!role) {
    next.role = 'admin';
  }

  return next;
}

/** Recovery on peskids.op-sly.com should complete here unless another tenant is explicit. */
export function shouldCompleteRecoveryOnPeskids(meta: Record<string, unknown>): boolean {
  const tenantSlug = normalizeMetadataValue(meta.tenant_slug);
  if (tenantSlug && tenantSlug !== PESKIDS_TENANT_SLUG) {
    return false;
  }

  const role = normalizeMetadataValue(meta.role);
  if (role && !PESKIDS_STAFF_ROLES.has(role)) {
    return false;
  }

  return true;
}

export function peskidsStaffRecoveryUpdatePath(meta: Record<string, unknown>): string {
  return recoveryTargetFromMetadata(metadataForPeskidsStaffRecovery(meta)).updatePasswordPath;
}

export function currentPeskidsRecoveryTarget(): RecoveryTarget {
  return recoveryTargetFromMetadata({ tenant_slug: PESKIDS_TENANT_SLUG, role: 'admin' });
}
