import { extractIp, logAuditEvent } from '../../../../lib/audit';
import { requireAdminToken } from '../../../../lib/auth';
import { HTTP_STATUS } from '../../../../lib/constants';
import { enqueueN8nExecution, n8nExecuteBodySchema } from '../../../../lib/n8n-super-agent';
import { checkRateLimit } from '../../../../lib/rate-limiter';

function json200(body: Record<string, unknown>): Response {
  return Response.json(body, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const authError = requireAdminToken(request);
  if (authError) {
    return authError;
  }

  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `n8n-execute:${ip}` : 'n8n-execute:anonymous');
  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json200({
      success: false,
      error: 'Invalid JSON body',
      observation: 'Request body must be valid JSON',
    });
  }

  const parsed = n8nExecuteBodySchema.safeParse(raw);
  if (!parsed.success) {
    return json200({
      success: false,
      error: 'Invalid body',
      observation: parsed.error.message,
    });
  }

  try {
    const enqueueResult = await enqueueN8nExecution(parsed.data);
    void logAuditEvent({
      action: 'n8n_execute',
      resource: 'n8n:execution',
      ip,
      user_agent: request.headers.get('user-agent') ?? undefined,
      metadata: {
        goal: parsed.data.goal,
      },
    });
    return json200({
      success: true,
      observation: 'Execution delegated by opsly_billy',
      ...enqueueResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json200({
      success: false,
      error: message,
      observation: message,
    });
  }
}
