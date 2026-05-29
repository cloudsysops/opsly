import { requireAdminAccessUnlessDemoRead } from '../../../../../../lib/auth';
import { proxyRuntimeOrchestrator } from '../../../../../../lib/runtime-proxy';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateCallStateSchema = z.object({
  state: z.enum(['ringing', 'connected', 'hold', 'ended', 'failed']),
});

export async function GET(
  request: Request,
  { params }: { params: { callId: string } }
): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }

  return proxyRuntimeOrchestrator(`/internal/voice/calls/${params.callId}`, {
    method: 'GET',
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { callId: string } }
): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const validated = UpdateCallStateSchema.parse(body);

    return proxyRuntimeOrchestrator(`/internal/voice/calls/${params.callId}`, {
      method: 'PATCH',
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
