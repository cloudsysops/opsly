import { requireAdminAccess } from '../../../../../../../lib/auth';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { executePendingFollowups } from '../../../../../../../lib/peskids/followup';

const PESKIDS_TENANT_SLUG = 'peskids';

export async function POST(
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
    const result = await executePendingFollowups(slug);
    const status =
      result.failed > 0 && result.processed === 0
        ? HTTP_STATUS.INTERNAL_ERROR
        : result.failed > 0
          ? HTTP_STATUS.ACCEPTED
          : HTTP_STATUS.OK;

    return Response.json({ ok: status < 400, ...result }, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `failed_to_execute_followups: ${message}` },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}
