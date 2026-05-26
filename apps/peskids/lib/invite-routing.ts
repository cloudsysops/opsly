import { recoveryTargetFromMetadata } from './auth-recovery'

export function resolveInviteActivationRedirectPath(meta: Record<string, unknown>): string {
  const target = recoveryTargetFromMetadata(meta)
  const role = typeof meta.role === 'string' ? meta.role.trim().toLowerCase() : ''

  if (target.app === 'platform_admin') {
    return `${target.origin.replace(/\/$/, '')}/dashboard`
  }

  if (target.app === 'peskids_staff') {
    if (role === 'support') {
      return `${target.origin.replace(/\/$/, '')}/support/dashboard`
    }
    if (role === 'teacher') {
      return `${target.origin.replace(/\/$/, '')}/teacher/dashboard`
    }
    return `${target.origin.replace(/\/$/, '')}/admin`
  }

  return `${target.origin.replace(/\/$/, '')}/dashboard`
}
