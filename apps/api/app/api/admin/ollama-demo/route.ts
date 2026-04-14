import { requireAdminAccess } from '../../../../lib/auth';
import {
  ORCHESTRATOR_INTERNAL_URL,
  buildOllamaDemoRequestId,
  callOrchestratorEnqueueOllama,
  checkBudgetForOllamaDemo,
  parseTaskType,
  resolveTenantBySlug,
} from '../../../../lib/admin-ollama-demo';
import { HTTP_STATUS } from '../../../../lib/constants';

function requirePlatformAdminToken(): Response | string {
  const adminToken = process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';
  if (adminToken.length === 0) {
    return Response.json(
      { error: 'PLATFORM_ADMIN_TOKEN is not set' },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
  return adminToken;
}

async function readJsonObject(request: Request): Promise<Response | Record<string, unknown>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  return raw as Record<string, unknown>;
}

/**
 * Demo admin: encola un job `ollama` en el orchestrator (worker → LLM Gateway `/v1/text` → Ollama).
 * GET `?job_id=` consulta estado vía orchestrator interno.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth) {
    return auth;
  }

  const tokenOrErr = requirePlatformAdminToken();
  if (typeof tokenOrErr !== 'string') {
    return tokenOrErr;
  }

  const body = await readJsonObject(request);
  if (body instanceof Response) {
    return body;
  }

  const tenantSlug = typeof body.tenant_slug === 'string' ? body.tenant_slug.trim() : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (tenantSlug.length === 0 || prompt.length === 0) {
    return Response.json(
      { error: 'tenant_slug and prompt required' },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const tenant = await resolveTenantBySlug(tenantSlug);
  if (!tenant) {
    return Response.json({ error: 'Tenant not found' }, { status: HTTP_STATUS.NOT_FOUND });
  }

  const budgetErr = await checkBudgetForOllamaDemo(tenant.id, tenantSlug);
  if (budgetErr) {
    return budgetErr;
  }

  const requestId = buildOllamaDemoRequestId();
  return callOrchestratorEnqueueOllama(tokenOrErr, {
    tenantSlug,
    tenantId: tenant.id,
    taskType: parseTaskType(body.task_type),
    prompt,
    plan: tenant.plan,
    requestId,
  });
}

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth) {
    return auth;
  }

  const tokenOrErr = requirePlatformAdminToken();
  if (typeof tokenOrErr !== 'string') {
    return tokenOrErr;
  }

  const url = new URL(request.url);
  const jobId = url.searchParams.get('job_id')?.trim() ?? '';
  if (jobId.length === 0) {
    return Response.json({ error: 'job_id query required' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  let orchRes: Response;
  try {
    orchRes = await fetch(
      `${ORCHESTRATOR_INTERNAL_URL}/internal/openclaw-job?job_id=${encodeURIComponent(jobId)}`,
      {
        headers: { Authorization: `Bearer ${tokenOrErr}` },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `orchestrator unreachable: ${message}` },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );
  }

  const payload: unknown = await orchRes.json().catch(() => null);
  return Response.json(
    typeof payload === 'object' && payload !== null
      ? payload
      : { error: 'invalid orchestrator response' },
    { status: orchRes.status }
  );
}
