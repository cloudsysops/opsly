import { requireAdminAccess } from '../../../../../lib/auth';
import { createInstallPlan } from '../../../../../lib/local-automation/install-plan';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const body = (await request.json().catch(() => null)) as {
    tool?: unknown;
    actor?: unknown;
  } | null;
  const toolId = typeof body?.tool === 'string' ? body.tool.trim() : '';
  if (!toolId) {
    return Response.json({ error: 'tool is required' }, { status: 400 });
  }

  const plan = await createInstallPlan(
    toolId,
    typeof body?.actor === 'string' ? body.actor : 'admin'
  );
  if (!plan) {
    return Response.json({ error: 'tool_not_found' }, { status: 404 });
  }
  return Response.json(plan, { status: plan.allowed ? 200 : 403 });
}
