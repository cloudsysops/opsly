import { requireAdminToken } from '../../../../lib/auth';
import { HTTP_STATUS } from '../../../../lib/constants';
import {
  createHelpRequest,
  listPendingHelpRequests,
  resolveHelpRequestRecord,
  type HelpAssignedTo,
  type HelpBlockageType,
} from '../../../../lib/help-request-store';
import { extractIp, logAuditEvent } from '../../../../lib/audit';
import { checkRateLimit } from '../../../../lib/rate-limiter';

function isBlockageType(value: unknown): value is HelpBlockageType {
  return (
    value === 'permission' ||
    value === 'installation' ||
    value === 'external_resource' ||
    value === 'decision' ||
    value === 'delegation'
  );
}

function assignedToOrHuman(value: unknown): HelpAssignedTo {
  if (value === 'cursor' || value === 'copilot' || value === 'claude') {
    return value;
  }
  return 'human';
}

export async function POST(request: Request): Promise<Response> {
  const auth = requireAdminToken(request);
  if (auth) {
    return auth;
  }

  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `help-request-create:${ip}` : 'help-request-create:anon');
  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'Invalid body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  const input = body as Record<string, unknown>;
  const requiredTextValues = [
    input.jobId,
    input.jobName,
    input.errorMessage,
    input.suggestedAction,
  ];
  if (!requiredTextValues.every((value) => typeof value === 'string')) {
    return Response.json({ error: 'Missing required fields' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  if (!isBlockageType(input.blockageType)) {
    return Response.json({ error: 'Missing required fields' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  const [jobId, jobName, errorMessage, suggestedAction] = requiredTextValues;
  const created = await createHelpRequest({
    jobId,
    jobName,
    tenantSlug: typeof input.tenantSlug === 'string' ? input.tenantSlug : 'platform',
    blockageType: input.blockageType,
    errorMessage,
    context:
      typeof input.context === 'object' && input.context !== null
        ? (input.context as Record<string, unknown>)
        : {},
    suggestedAction,
  });

  void logAuditEvent({
    tenant_slug: created.tenantSlug,
    action: 'create_help_request',
    resource: `help-request:${created.id}`,
    ip,
    user_agent: request.headers.get('user-agent') ?? undefined,
    metadata: { jobId, jobName, blockageType: created.blockageType },
  });

  return Response.json(
    {
      success: true,
      helpId: created.id,
      message: 'Solicitud de ayuda creada y almacenada.',
    },
    { status: HTTP_STATUS.CREATED }
  );
}

export async function GET(request: Request): Promise<Response> {
  const auth = requireAdminToken(request);
  if (auth) {
    return auth;
  }
  const pending = await listPendingHelpRequests();
  return Response.json({ count: pending.length, requests: pending }, { status: HTTP_STATUS.OK });
}

export async function PATCH(request: Request): Promise<Response> {
  const auth = requireAdminToken(request);
  if (auth) {
    return auth;
  }

  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `help-request-resolve:${ip}` : 'help-request-resolve:anon');
  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: 'Invalid body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  const input = body as Record<string, unknown>;
  if (typeof input.helpId !== 'string' || typeof input.resolution !== 'string') {
    return Response.json(
      { error: 'helpId and resolution are required' },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }
  const updated = await resolveHelpRequestRecord(
    input.helpId,
    input.resolution,
    assignedToOrHuman(input.resolvedBy)
  );

  void logAuditEvent({
    tenant_slug: updated.tenantSlug,
    action: 'resolve_help_request',
    resource: `help-request:${updated.id}`,
    ip,
    user_agent: request.headers.get('user-agent') ?? undefined,
    metadata: { resolution: input.resolution, resolvedBy: input.resolvedBy },
  });

  return Response.json(
    { success: true, message: 'Solicitud resuelta', request: updated },
    { status: HTTP_STATUS.OK }
  );
}
