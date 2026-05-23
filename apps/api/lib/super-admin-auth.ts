import type { User } from '@supabase/supabase-js';
import { jsonError } from './api-response';
import { HTTP_STATUS } from './constants';
import { getUserFromAuthorizationHeader } from './portal-auth';

const DEFAULT_SUPER_ADMIN_EMAILS = ['cboteros1@gmail.com'];

function metadataRecord(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return {};
  }
  return meta as Record<string, unknown>;
}

function normalizeEmail(email: unknown): string {
  if (typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
}

function readSuperAdminEmails(): Set<string> {
  const configured = process.env.OPSLY_SUPER_ADMIN_EMAILS?.split(',') ?? [];
  const emails = [...configured, ...DEFAULT_SUPER_ADMIN_EMAILS]
    .map((value) => normalizeEmail(value))
    .filter((value) => value.length > 0);
  return new Set(emails);
}

/**
 * Super Admin: `user_metadata` o `app_metadata` con role=admin o is_superuser=true,
 * o correo explícitamente allowlisted para operación global.
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
  const superAdminEmails = readSuperAdminEmails();
  if (superAdminEmails.has(normalizeEmail(user.email))) {
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
