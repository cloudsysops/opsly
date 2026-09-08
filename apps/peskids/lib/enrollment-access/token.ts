import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const ENROLLMENT_TOKEN_PURPOSE = 'enrollment' as const;
export const ENROLLMENT_TOKEN_TENANT = 'peskids' as const;
export const ENROLLMENT_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const ENROLLMENT_TOKEN_BYTES = 32;
export const ENROLLMENT_LINK_UNAVAILABLE = 'Este enlace no está disponible.';

export type EnrollmentTokenPurpose = typeof ENROLLMENT_TOKEN_PURPOSE;

export function generateEnrollmentToken(): string {
  return randomBytes(ENROLLMENT_TOKEN_BYTES).toString('base64url');
}

export function hashEnrollmentToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export function enrollmentHashesEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function isOpaqueEnrollmentToken(rawToken: string): boolean {
  return /^[A-Za-z0-9_-]{32,128}$/.test(rawToken.trim());
}
