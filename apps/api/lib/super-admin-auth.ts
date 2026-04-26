import type { User } from '@supabase/supabase-js';
import { jsonError } from './api-response';
import { HTTP_STATUS } from './constants';
import { getUserFromAuthorizationHeader } from './portal-auth';

function metadataRecord(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return {};
  }
  return meta as Record<string, unknown>;
}

/**
 * Super Admin: `user_metadata` o `app_metadata` con role=admin o is_superuser=true.
 */
export function isSuperAdminUser(user: User): boolean {
  const userMeta = metadataRecord(user.user_metadata);
  const appMeta = metadataRecord(user.app_metadata);
  if (userMeta.role === 'admin' || appMeta.role === 'admin') {
    return true;
  }
  if (userMeta.is_superuser === true || appMeta.is_superuser === true) {
    return true;
  }
  return false;
}

export type SuperAdminResolution = { ok: true; user: User } | { ok: false; response: Response };

/**
 * JWT Bearer obligatorio; 403 si el usuario no es super admin.
 */
export async function resolveSuperAdminSession(request: Request): Promise<SuperAdminResolution> {
  const user = await getUserFromAuthorizationHeader(request);
  if (!user) {
    return { ok: false, response: jsonError('Unauthorized', HTTP_STATUS.UNAUTHORIZED) };
  }
  if (!isSuperAdminUser(user)) {
    return { ok: false, response: jsonError('Forbidden', HTTP_STATUS.FORBIDDEN) };
  }
  return { ok: true, user };
}
