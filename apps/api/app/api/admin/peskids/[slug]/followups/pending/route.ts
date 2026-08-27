import { requireAdminAccess } from '../../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { logger } from '../../../../../../../lib/logger';
import { getPendingFollowups } from '../../../../../../../lib/peskids/followup';

const PESKIDS_TENANT_SLUG = 'peskids';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth !== null) {
    return auth;
  }

  const { slug } = await context.params;
  if (slug !== PESKIDS_TENANT_SLUG) {
    return Response.json({ error: 'Not found' }, { status: HTTP_STATUS.NOT_FOUND });
  }

  try {
    const result = await getPendingFollowups(slug);
    return Response.json({ ok: true, ...result }, { status: HTTP_STATUS.OK });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('peskids.admin.followups.pending_exception', {
      slug,
      error: message,
    });
    return Response.json(
      { error: 'failed_to_read_pending_followups' },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}
