/** Recovery email targets and cross-app routing (shared Supabase project). */

import {
  buildRecoveryRedirectTo,
  forwardRecoveryToOrigin,
  inviteActivationPathFromUrl,
  isInviteLink,
  isRecoveryLink,
  metadataFromJwtAccessToken,
  recoveryForwardPathFromUrl,
  resolveRecoveryTargetFromMetadata,
  type RecoveryTarget,
  type RecoveryRoutingConfig,
} from '../../../lib/runtime/src/tenant-auth-routing'

const PESKIDS_ORIGIN =
  process.env.NEXT_PUBLIC_PESKIDS_SITE_URL?.trim() || 'https://peskids.op-sly.com'
const PORTAL_ORIGIN =
  process.env.NEXT_PUBLIC_PORTAL_URL?.trim() ||
  (typeof window !== 'undefined' ? window.location.origin : 'https://portal.op-sly.com')
const ADMIN_ORIGIN =
  process.env.NEXT_PUBLIC_ADMIN_URL?.trim() || 'https://admin.op-sly.com'

const ROUTING_CONFIG: RecoveryRoutingConfig = {
  portal: {
    origin: PORTAL_ORIGIN,
    updatePasswordPath: '/update-password',
  },
  platformAdmin: {
    origin: ADMIN_ORIGIN,
    updatePasswordPath: '/update-password',
    tenantSlugs: ['intcloudsysops'],
  },
  tenantRules: [
    {
      tenantSlug: 'peskids',
      app: 'peskids_staff',
      origin: PESKIDS_ORIGIN,
      staffRoles: ['owner', 'admin', 'support', 'teacher'],
      updatePasswordPath: '/admin/update-password',
    },
  ],
}

export type { RecoveryTarget }
export {
  buildRecoveryRedirectTo,
  forwardRecoveryToOrigin,
  inviteActivationPathFromUrl,
  isInviteLink,
  isRecoveryLink,
  metadataFromJwtAccessToken,
  recoveryForwardPathFromUrl,
}

export function recoveryTargetFromMetadata(meta: Record<string, unknown>): RecoveryTarget {
  return resolveRecoveryTargetFromMetadata(meta, ROUTING_CONFIG)
}

export function currentPortalRecoveryTarget(): RecoveryTarget {
  return recoveryTargetFromMetadata({ tenant_slug: 'portal' })
}
