import { requireAdminAccessUnlessDemoRead } from '../../../../../lib/auth';
import { proxyRuntimeOrchestrator } from '../../../../../lib/runtime-proxy';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const InitiateCallSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  channel: z.enum(['whatsapp', 'telegram', 'web']),
});

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const validated = InitiateCallSchema.parse(body);

    return proxyRuntimeOrchestrator('/internal/voice/calls', {
      method: 'POST',
      body: JSON.stringify(validated),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Validation error',
          details: error.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '50';
  const offset = searchParams.get('offset') || '0';

  return proxyRuntimeOrchestrator(`/internal/voice/calls?limit=${limit}&offset=${offset}`, {
    method: 'GET',
  });
}
