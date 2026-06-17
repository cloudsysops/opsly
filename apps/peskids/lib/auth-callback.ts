import type { User } from '@supabase/supabase-js';
import { recoveryTargetFromMetadata } from '@/lib/auth-recovery';

export function userMetadataRecord(user: User): Record<string, unknown> {
  return {
    ...((user.app_metadata ?? {}) as Record<string, unknown>),
    ...((user.user_metadata ?? {}) as Record<string, unknown>),
  };
}

export function resolveLoginPath(nextPath: string): string {
  if (nextPath.startsWith('/familias')) return '/familias/login';
  if (nextPath.startsWith('/teacher')) return '/teacher/login';
  if (nextPath.startsWith('/support')) return '/support/login';
  return '/admin/login';
}

export function resolvePostAuthPath(next: string | null, user: User): string {
  if (next) return next.startsWith('/') ? next : '/admin';
  const role = (user.user_metadata as Record<string, unknown>)?.role as string | undefined;
  if (role === 'family' || role === 'parent') return '/familias/submissions';
  if (role === 'teacher') return '/teacher/dashboard';
  if (role === 'support') return '/support/dashboard';
  return '/admin';
}

export function resolveRecoveryUpdatePath(user: User, nextPath: string | null): string {
  if (nextPath?.includes('update-password')) {
    return nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
  }
  return recoveryTargetFromMetadata(userMetadataRecord(user)).updatePasswordPath;
}
