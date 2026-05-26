import { requireAdminAccessUnlessDemoRead } from '../../../../../lib/auth';
import { readAutomationAuditEvents } from '../../../../../lib/local-automation/audit-log';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }
  const url = new URL(request.url);
  const limit = Number.parseInt(url.searchParams.get('limit') ?? '50', 10);
  return Response.json({
    generated_at: new Date().toISOString(),
    events: await readAutomationAuditEvents(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50),
  });
}
