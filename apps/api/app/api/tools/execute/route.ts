import {
  executeToolAction,
  resolveOpslyRepoRoot,
  toolsExecuteBodySchema,
  type ToolsExecuteBody,
} from '../../../../lib/tools-execute';

/** Misma convención que `lib/auth.ts` (Bearer o `x-admin-token`). */
function readAdminTokenFromRequest(request: Request): string {
  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') === true ? auth.slice('Bearer '.length).trim() : '';
  const headerToken = request.headers.get('x-admin-token')?.trim() ?? '';
  return bearer.length > 0 ? bearer : headerToken;
}

function json200(body: Record<string, unknown>): Response {
  return Response.json(body, { status: 200 });
}

function misconfiguredResponse(): Response {
  return json200({
    success: false,
    error: 'Server misconfiguration: PLATFORM_ADMIN_TOKEN is not set',
    observation: 'PLATFORM_ADMIN_TOKEN is not set',
  });
}

function unauthorizedResponse(): Response {
  return json200({
    success: false,
    error: 'Unauthorized',
    observation: 'Invalid or missing Bearer token',
  });
}

function invalidJsonResponse(): Response {
  return json200({
    success: false,
    error: 'Invalid JSON body',
    observation: 'Request body must be JSON',
  });
}

function invalidBodyResponse(message: string): Response {
  return json200({
    success: false,
    error: 'Invalid body',
    observation: message,
  });
}

async function runExecute(data: ToolsExecuteBody): Promise<Response> {
  const repoRoot = resolveOpslyRepoRoot();
  const { action, args } = data;
  const result = await executeToolAction(action, args, repoRoot);
  const body: Record<string, unknown> = {
    success: result.success,
    observation: result.observation,
  };
  if (result.data !== undefined) {
    body.data = result.data;
  }
  if (result.error !== undefined) {
    body.error = result.error;
  }
  return json200(body);
}

async function runExecuteSafe(data: ToolsExecuteBody): Promise<Response> {
  try {
    return await runExecute(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json200({
      success: false,
      error: message,
      observation: message,
    });
  }
}

/**
 * POST /api/tools/execute
 *
 * Herramientas síncronas seguras para el OpslyActionAdapter (OAR). Requiere
 * `Authorization: Bearer` o `x-admin-token` igual a `PLATFORM_ADMIN_TOKEN`.
 *
 * Respuesta siempre HTTP 200 con cuerpo JSON estructurado (`success`, `observation`, …).
 */
export async function POST(request: Request): Promise<Response> {
  const expected = process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';
  if (expected.length === 0) {
    return misconfiguredResponse();
  }
  const token = readAdminTokenFromRequest(request);
  if (token.length === 0 || token !== expected) {
    return unauthorizedResponse();
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  const parsed = toolsExecuteBodySchema.safeParse(raw);
  if (!parsed.success) {
    return invalidBodyResponse(parsed.error.message);
  }

  return runExecuteSafe(parsed.data);
}
