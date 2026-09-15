import {
  ENROLLMENT_TOKEN_PURPOSE,
  ENROLLMENT_TOKEN_TENANT,
  ENROLLMENT_TOKEN_TTL_MS,
  generateEnrollmentToken,
  hashEnrollmentToken,
} from './token';
import { appendEnrollmentTimeline, withEnrollmentAccess } from './metadata';
import { assertEnrollmentUrlHasNoPii, buildEnrollmentPublicUrl } from './url';
import { buildEnrollmentLinkDraft } from './whatsapp';
import type { EnrollmentAccessRecord } from './types';
import type { EnrollmentLeadStore as Store } from './store';

export type IssuedEnrollmentLink = {
  lead_id: string;
  url: string;
  expires_at: string;
  whatsapp_draft: { template: 'ENROLLMENT_LINK'; message: string };
};

export async function issueEnrollmentLink(input: {
  store: Store;
  leadId: string;
  tenantSlug?: string;
  leadName: string;
  now?: Date;
  requestId?: string;
}): Promise<IssuedEnrollmentLink | null> {
  const tenantSlug = input.tenantSlug ?? ENROLLMENT_TOKEN_TENANT;
  const lead = await input.store.getById(input.leadId, tenantSlug);
  if (!lead) {
    return null;
  }

  const now = input.now ?? new Date();
  const rawToken = generateEnrollmentToken();
  const access: EnrollmentAccessRecord = {
    token_hash: hashEnrollmentToken(rawToken),
    purpose: ENROLLMENT_TOKEN_PURPOSE,
    tenant_slug: tenantSlug,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + ENROLLMENT_TOKEN_TTL_MS).toISOString(),
    revoked_at: null,
    used_at: null,
    opened_at: null,
    policy: 'single_use_on_submit',
  };

  const metadata = appendEnrollmentTimeline(
    withEnrollmentAccess(lead.metadata, access),
    'enrollment.link.created',
    access.created_at,
    input.requestId
  );
  await input.store.saveMetadata(lead.id, tenantSlug, metadata);

  const url = buildEnrollmentPublicUrl(rawToken);
  assertEnrollmentUrlHasNoPii(url);
  return {
    lead_id: lead.id,
    url,
    expires_at: access.expires_at,
    whatsapp_draft: buildEnrollmentLinkDraft({ leadName: input.leadName, enrollmentUrl: url }),
  };
}
