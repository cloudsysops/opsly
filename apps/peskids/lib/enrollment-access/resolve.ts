import { ENROLLMENT_LINK_UNAVAILABLE, ENROLLMENT_TOKEN_TENANT, hashEnrollmentToken, isOpaqueEnrollmentToken } from './token';
import { evaluateEnrollmentAccess } from './policy';
import { appendEnrollmentTimeline, withEnrollmentAccess } from './metadata';
import type { EnrollmentLeadRecord, TokenDenialReason } from './types';
import type { EnrollmentLeadStore } from './store';

export type ResolvedEnrollmentToken =
  | { ok: true; lead: EnrollmentLeadRecord; already_submitted: boolean }
  | { ok: false; error: string; reason: TokenDenialReason };

function deny(reason: TokenDenialReason): ResolvedEnrollmentToken {
  return { ok: false, error: ENROLLMENT_LINK_UNAVAILABLE, reason };
}

export async function resolveEnrollmentToken(input: {
  store: EnrollmentLeadStore;
  rawToken: string;
  mode: 'open' | 'submit';
  now?: Date;
  markOpened?: boolean;
  requestId?: string;
}): Promise<ResolvedEnrollmentToken> {
  const raw = input.rawToken.trim();
  if (!isOpaqueEnrollmentToken(raw)) {
    return deny('invalid');
  }

  const expectedHash = hashEnrollmentToken(raw);
  const lead = await input.store.findByTokenHash(expectedHash, ENROLLMENT_TOKEN_TENANT);
  if (!lead) {
    return deny('invalid');
  }

  const access = lead.metadata.enrollment_access;
  const evaluation = evaluateEnrollmentAccess(access, expectedHash, input.now, input.mode);
  if (!evaluation.ok) {
    if (evaluation.reason === 'replay' && lead.metadata.enrollment_outcome) {
      return { ok: true, lead, already_submitted: true };
    }
    return deny(evaluation.reason);
  }

  if (input.mode === 'open' && input.markOpened && access && !access.opened_at) {
    const openedAt = (input.now ?? new Date()).toISOString();
    const nextAccess = { ...access, opened_at: openedAt };
    const metadata = appendEnrollmentTimeline(
      withEnrollmentAccess(lead.metadata, nextAccess),
      'enrollment.link.opened',
      openedAt,
      input.requestId
    );
    await input.store.saveMetadata(lead.id, ENROLLMENT_TOKEN_TENANT, metadata);
    lead.metadata = metadata;
  }

  return {
    ok: true,
    lead,
    already_submitted: Boolean(lead.metadata.enrollment_outcome || access?.used_at),
  };
}
