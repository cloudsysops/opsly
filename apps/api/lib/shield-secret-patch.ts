import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from './constants';
import { logger } from './logger';
import { meterShieldApiCall } from './shield-metering';
import { getServiceClient } from './supabase';

export type ShieldFindingStatus = 'open' | 'resolved' | 'false_positive';

export async function applyShieldSecretStatusPatch(params: {
  request: NextRequest;
  slug: string;
  findingId: string;
  status: ShieldFindingStatus;
}): Promise<Response> {
  const { request, slug, findingId, status } = params;
  const db = getServiceClient();
  const { data: existing, error: fetchErr } = await db
    .schema('platform')
    .from('shield_secret_findings')
    .select('id, tenant_slug')
    .eq('id', findingId)
    .maybeSingle();

  if (fetchErr !== null) {
    logger.error('shield patch fetch', fetchErr);
    return Response.json({ error: 'Internal error' }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
  const row = existing as { id: string; tenant_slug: string } | null;
  if (row === null || row.tenant_slug !== slug) {
    return Response.json({ error: 'Not found' }, { status: HTTP_STATUS.NOT_FOUND });
  }

  const { error: updErr } = await db
    .schema('platform')
    .from('shield_secret_findings')
    .update({ status })
    .eq('id', findingId)
    .eq('tenant_slug', slug);

  if (updErr !== null) {
    logger.error('shield patch update', updErr);
    return Response.json({ error: 'Update failed' }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }

  const hdrId = request.headers.get('x-request-id')?.trim();
  void meterShieldApiCall({
    tenant_slug: slug,
    ...(hdrId !== undefined && hdrId.length > 0 ? { request_id: hdrId } : {}),
    feature: 'shield_secret_patch',
    metadata: { finding_id: findingId, status },
  });

  return Response.json({ ok: true, id: findingId, status });
}
