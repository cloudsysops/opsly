import { requireAdminAccessUnlessDemoRead } from '../../../../lib/auth';
import { proxyRuntimeOrchestrator } from '../../../../lib/runtime-proxy';
import { extractIp, logAuditEvent } from '../../../../lib/audit';
import { checkRateLimit } from '../../../../lib/rate-limiter';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const InitiateCallSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  channel: z.enum(['whatsapp', 'telegram', 'web']),
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

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) return authError;

  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(
    ip ? `voice-calls-initiate:${ip}` : 'voice-calls-initiate:anonymous'
  );

  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const validated = InitiateCallSchema.parse(await request.json());
    const response = await proxyRuntimeOrchestrator('/internal/voice/calls', {
      method: 'POST',
      body: JSON.stringify(validated),
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      void logAuditEvent({
        action: 'voice_call_initiate',
        resource: `voice:calls:${validated.from}:${validated.to}`,
        ip,
        user_agent: request.headers.get('user-agent') ?? undefined,
        metadata: {
          from: validated.from,
          to: validated.to,
          channel: validated.channel,
        },
      });
    }

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '50';
  const offset = searchParams.get('offset') || '0';

  return proxyRuntimeOrchestrator(`/internal/voice/calls?limit=${limit}&offset=${offset}`, {
    method: 'GET',
  });
}
