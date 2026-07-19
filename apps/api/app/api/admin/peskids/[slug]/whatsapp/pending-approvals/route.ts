/**
 * GET /api/admin/peskids/[slug]/whatsapp/pending-approvals
 * List messages pending approval
 */

import type { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '../../../../../../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../../../../../../lib/constants';
import { listPendingApprovals } from '../../../../../../../../../lib/whatsapp-approval';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<Response> {
  const { slug } = params;
  const limit = request.nextUrl.searchParams.get('limit') || '50';

  if (slug !== 'peskids') {
    return jsonError('Invalid tenant', HTTP_STATUS.FORBIDDEN);
  }

  try {
    const result = await listPendingApprovals('peskids', parseInt(limit, 10));

    if (!result.ok) {
      return jsonError(result.error || 'Failed to fetch messages', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    return jsonSuccess(
      {
        tenant: slug,
        count: result.messages?.length || 0,
        messages: result.messages || [],
      },
      HTTP_STATUS.OK
    );
  } catch (err) {
    return jsonError(
      `Failed to fetch pending approvals: ${err instanceof Error ? err.message : 'Unknown error'}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
