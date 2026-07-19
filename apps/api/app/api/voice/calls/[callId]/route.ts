import { requireAdminAccessUnlessDemoRead } from '../../../../../lib/auth';
import { proxyRuntimeOrchestrator } from '../../../../../lib/runtime-proxy';
import { extractIp, logAuditEvent } from '../../../../../lib/audit';
import { checkRateLimit } from '../../../../../lib/rate-limiter';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateCallStateSchema = z.object({
  state: z.enum(['ringing', 'connected', 'hold', 'ended', 'failed']),
});

function handleRouteError(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return new Response(JSON.stringify({ error: 'Validation error', details: error.errors }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ error: 'Internal server error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ callId: string }> }
): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) return authError;

  const { callId } = await context.params;

  return proxyRuntimeOrchestrator(`/internal/voice/calls/${callId}`, {
    method: 'GET',
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ callId: string }> }
): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) return authError;

  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(
    ip ? `voice-calls-update:${ip}` : 'voice-calls-update:anonymous'
  );

  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { callId } = await context.params;
    const validated = UpdateCallStateSchema.parse(await request.json());

    const response = await proxyRuntimeOrchestrator(`/internal/voice/calls/${callId}`, {
      method: 'PATCH',
      body: JSON.stringify(validated),
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      void logAuditEvent({
        action: 'voice_call_update_state',
        resource: `voice:calls:${callId}`,
        ip,
        user_agent: request.headers.get('user-agent') ?? undefined,
        metadata: { callId, state: validated.state },
      });
    }

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
