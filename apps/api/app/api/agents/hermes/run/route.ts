import { requireAdminAccess } from '../../../../../lib/auth';
import { runHermesTask, type HermesMode } from '../../../../../lib/agents/hermes/hermes-client';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { parseJsonBody, tryRoute } from '../../../../../lib/api-response';

const MODES: HermesMode[] = ['review', 'plan', 'debug', 'security', 'research'];

function isHermesMode(value: unknown): value is HermesMode {
  return typeof value === 'string' && MODES.includes(value as HermesMode);
}

export async function POST(request: Request): Promise<Response> {
  return tryRoute('POST /api/agents/hermes/run', async () => {
    const auth = await requireAdminAccess(request);
    if (auth) {
      return auth;
    }

    const parsed = await parseJsonBody(request);
    if (!parsed.ok) {
      return parsed.response;
    }
    const body = parsed.body as Record<string, unknown>;
    const task = typeof body.task === 'string' ? body.task : '';
    const context = typeof body.context === 'string' ? body.context : undefined;
    const model = typeof body.model === 'string' ? body.model : undefined;
    const mode = body.mode;

    if (!isHermesMode(mode)) {
      return Response.json(
        { ok: false, error: `mode must be one of: ${MODES.join(', ')}` },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const result = await runHermesTask({
      task,
      context,
      model,
      mode,
    });

    if (!result.ok) {
      return Response.json(
        { ok: false, agent: 'hermes', error: result.error },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    return Response.json({
      ok: true,
      agent: 'hermes',
      provider: result.provider,
      model: result.model,
      result: result.result,
    });
  });
}
