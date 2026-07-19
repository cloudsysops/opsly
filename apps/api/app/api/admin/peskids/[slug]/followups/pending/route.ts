import { requireAdminAccess } from '../../../../../../../lib/auth';
import { HTTP_STATUS } from '@intcloudsysops/constants';
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
    return Response.json(
      { error: `failed_to_read_pending_followups: ${message}` },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}
