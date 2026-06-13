import { requireAdminToken } from '../../../../lib/auth';
import { HTTP_STATUS } from '../../../../lib/constants';
import {
  createHelpRequest,
  listPendingHelpRequests,
  resolveHelpRequestRecord,
  type HelpAssignedTo,
  type HelpBlockageType,
} from '../../../../lib/help-request-store';

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
  return Response.json(
    { success: true, message: 'Solicitud resuelta', request: updated },
    { status: HTTP_STATUS.OK }
  );
}
