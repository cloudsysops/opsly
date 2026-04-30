import { requireAdminAccess } from '../../../../../../lib/auth';
import {
  ORCHESTRATOR_INTERNAL_URL,
  getOpenClawMissionControlSnapshot,
} from '../../../../../../lib/admin-mission-control-openclaw';
import { HTTP_STATUS } from '../../../../../../lib/constants';

function requirePlatformAdminToken(): string | null {
  const token = process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';
  return token.length > 0 ? token : null;
}

async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const raw = (await request.json()) as unknown;
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return null;
    }
    return raw as Record<string, unknown>;
  } catch {
    return null;
  }
}

const TENANT_SLUG_REGEX = /^[a-z0-9-]{3,64}$/;

function validateRequestBody(body: Record<string, unknown> | null): Response | null {
  if (body === null) {
    return Response.json({ error: 'invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  const tenantSlug = typeof body.tenant_slug === 'string' ? body.tenant_slug.trim() : '';
  if (!TENANT_SLUG_REGEX.test(tenantSlug)) {
    return Response.json(
      { error: 'valid tenant_slug required' },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }
  return null;
}

async function callOrchestratorApi(
  adminToken: string,
  body: Record<string, unknown>
): Promise<Response> {
  const tenantSlug = (body.tenant_slug as string).trim();
  const objective = typeof body.objective === 'string' ? body.objective.trim() : '';
  const sourceDoc = typeof body.source_doc === 'string' ? body.source_doc.trim() : '';
  const targetDoc = typeof body.target_doc === 'string' ? body.target_doc.trim() : '';

  try {
    return await fetch(`${ORCHESTRATOR_INTERNAL_URL}/internal/openclaw/improve-documentation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant_slug: tenantSlug,
        objective: objective.length > 0 ? objective : undefined,
        source_doc: sourceDoc.length > 0 ? sourceDoc : undefined,
        target_doc: targetDoc.length > 0 ? targetDoc : undefined,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`orchestrator unreachable: ${message}`);
  }
}

async function handleOrchestratorResponse(response: Response): Promise<Response> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return Response.json(
      typeof payload === 'object' && payload !== null ? payload : { error: 'orchestrator_error' },
      { status: response.status }
    );
  }

  const snapshot = await getOpenClawMissionControlSnapshot().catch(() => null);
  return Response.json(
    {
      ...(typeof payload === 'object' && payload !== null ? payload : {}),
      snapshot_generated_at: snapshot?.generated_at ?? null,
      intents_in_progress: snapshot?.intents_in_progress.length ?? null,
    },
    { status: HTTP_STATUS.ACCEPTED }
  );
}

export async function POST(request: Request): Promise<Response> {
  const authErr = await requireAdminAccess(request);
  if (authErr) {
    return authErr;
  }

  const adminToken = requirePlatformAdminToken();
  if (adminToken === null) {
    return Response.json(
      { error: 'PLATFORM_ADMIN_TOKEN is not set' },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }

  const body = await readJsonObject(request);
  const bodyErr = validateRequestBody(body);
  if (bodyErr) {
    return bodyErr;
  }

  let orchestratorResponse: Response;
  try {
    orchestratorResponse = await callOrchestratorApi(adminToken, body as Record<string, unknown>);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: HTTP_STATUS.SERVICE_UNAVAILABLE });
  }

  return handleOrchestratorResponse(orchestratorResponse);
}
