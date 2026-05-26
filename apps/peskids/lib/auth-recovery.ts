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
} from '../../../lib/runtime/src/tenant-auth-routing'

import {
  ADMIN_APP_ORIGIN,
  PESKIDS_APP_ORIGIN,
  PORTAL_APP_ORIGIN,
} from './app-url'

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
}

export type { RecoveryTarget }
export {
  buildRecoveryRedirectTo,
  forwardRecoveryToOrigin,
  inviteActivationPathFromUrl,
  isInviteLink,
  isRecoveryLink,
  metadataFromJwtAccessToken,
}

export function recoveryTargetFromMetadata(meta: Record<string, unknown>): RecoveryTarget {
  return resolveRecoveryTargetFromMetadata(meta, ROUTING_CONFIG)
}

export function currentPeskidsRecoveryTarget(): RecoveryTarget {
  return recoveryTargetFromMetadata({ tenant_slug: 'peskids', role: 'admin' })
}
