import {
  ENROLLMENT_TOKEN_PURPOSE,
  ENROLLMENT_TOKEN_TENANT,
  enrollmentHashesEqual,
} from './token';
import type { EnrollmentAccessRecord, TokenEvaluation } from './types';

export function evaluateEnrollmentAccess(
  record: EnrollmentAccessRecord | null | undefined,
  expectedHash: string,
  now: Date = new Date(),
  mode: 'open' | 'submit' = 'open'
): TokenEvaluation {
  if (!record || !record.token_hash) {
    return { ok: false, reason: 'invalid' };
  }
  if (!enrollmentHashesEqual(record.token_hash, expectedHash)) {
    return { ok: false, reason: 'invalid' };
  }
  if (record.purpose !== ENROLLMENT_TOKEN_PURPOSE) {
    return { ok: false, reason: 'wrong_purpose' };
  }
  if (record.tenant_slug !== ENROLLMENT_TOKEN_TENANT) {
    return { ok: false, reason: 'wrong_tenant' };
  }
  if (record.revoked_at) {
    return { ok: false, reason: 'revoked' };
  }
  if (Number.isNaN(Date.parse(record.expires_at)) || now.getTime() > Date.parse(record.expires_at)) {
    return { ok: false, reason: 'expired' };
  }
  if (record.used_at && mode === 'submit') {
    return { ok: false, reason: 'replay' };
  }
  return { ok: true };
}
